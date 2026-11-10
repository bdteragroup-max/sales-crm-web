'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Upload,
  Trash2,
  FileText,
  Video,
  Image as ImageIcon,
  Calendar,
  Send,
  Save,
  Layers,
  AlertCircle,
  CheckCircle2,
  Building2,
  User,
  Search,
  ChevronDown,
  Check,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  createBranchContent,
  updateBranchContent,
  submitBranchContentForReview,
} from '@/app/actions/branchContent';
import { matchBranch } from '@/app/lib/roleHelper';
import type {
  BranchContentItem,
  BranchContentPermissions,
  BranchMasterItem,
} from '@/app/lib/branchContentTypes';
import {
  CONTENT_TYPES,
  PRODUCT_GROUPS,
  CONTENT_OBJECTIVES,
  TARGET_CHANNELS,
  MEDIA_FORMATS,
} from '@/app/lib/branchContentTypes';

interface CreateEditBranchContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: BranchContentItem) => void;
  editItem?: BranchContentItem | null;
  branches: BranchMasterItem[];
  staffOptions: {
    id: string;
    name: string;
    nickname?: string | null;
    branch: string | null;
  }[];
  permissions: BranchContentPermissions | null;
}

interface UploadedMediaDraft {
  id?: string;
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType?: string;
  isExisting?: boolean;
}

export default function CreateEditBranchContentModal({
  isOpen,
  onClose,
  onSuccess,
  editItem,
  branches,
  staffOptions,
  permissions,
}: CreateEditBranchContentModalProps) {
  const defaultBranchId =
    editItem?.branchId ||
    permissions?.userBranchId ||
    branches[0]?.id ||
    '';

  const [title, setTitle] = useState('');
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [contentType, setContentType] = useState('SHORT_VIDEO');
  const [productGroup, setProductGroup] = useState(PRODUCT_GROUPS[0]);
  const [objective, setObjective] = useState(CONTENT_OBJECTIVES[0]);
  const [targetChannels, setTargetChannels] = useState<string[]>([
    'Facebook Page สาขา',
    'TikTok สาขา',
  ]);
  const [mediaFormat, setMediaFormat] = useState('9:16');
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [submissionDueDate, setSubmissionDueDate] = useState('');
  const [plannedPublishDate, setPlannedPublishDate] = useState('');

  const [mediaList, setMediaList] = useState<UploadedMediaDraft[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Searchable Assignee Dropdown state
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsAssigneeOpen(false);
      }
    };
    if (isAssigneeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAssigneeOpen]);

  // Filter staff strictly to the selected branch (`branchId`)
  const branchStaffOptions = useMemo(() => {
    const selectedBranchObj = branches.find(b => b.id === branchId);
    const list = staffOptions.filter(s => {
      if (!s.branch) return false;
      return (
        matchBranch(s.branch, branchId) ||
        (selectedBranchObj && matchBranch(s.branch, selectedBranchObj.name))
      );
    });

    // If current logged-in user belongs to this branch and isn't in `list` yet, include them
    const currentUserInStaff = staffOptions.find(s => s.id === permissions?.userId);
    const currentUserBelongsToBranch =
      !permissions?.canViewAllBranches ||
      (permissions?.userBranchId && matchBranch(permissions.userBranchId, branchId)) ||
      (currentUserInStaff?.branch && matchBranch(currentUserInStaff.branch, branchId));

    if (
      permissions?.userId &&
      currentUserBelongsToBranch &&
      !list.some(s => s.id === permissions.userId)
    ) {
      list.unshift({
        id: permissions.userId,
        name: currentUserInStaff?.name || permissions.userName,
        nickname: currentUserInStaff?.nickname || null,
        branch: branchId,
      });
    }

    return list;
  }, [staffOptions, branchId, branches, permissions]);

  // Filter branch staff by search query (matches full name or nickname)
  const filteredBranchStaff = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return branchStaffOptions;
    return branchStaffOptions.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [branchStaffOptions, assigneeSearch]);

  useEffect(() => {
    if (!isOpen) return;
    setIsAssigneeOpen(false);
    setAssigneeSearch('');
    if (editItem) {
      setTitle(editItem.title || '');
      setBranchId(editItem.branchId || defaultBranchId);
      setAssigneeId(editItem.assigneeId || editItem.createdById || '');
      setAssigneeName(editItem.assigneeName || editItem.createdByName || '');
      setContentType(editItem.contentType || 'SHORT_VIDEO');
      setProductGroup(editItem.productGroup || PRODUCT_GROUPS[0]);
      setObjective(editItem.objective || CONTENT_OBJECTIVES[0]);
      setTargetChannels(
        editItem.targetChannels && editItem.targetChannels.length > 0
          ? editItem.targetChannels
          : ['Facebook Page สาขา']
      );
      setMediaFormat(editItem.mediaFormat || '9:16');
      setCaption(editItem.caption || '');
      setDescription(editItem.description || '');
      setCallToAction(editItem.callToAction || '');
      setReferenceUrl(editItem.referenceUrl || '');
      setSubmissionDueDate(
        editItem.submissionDueDate ? editItem.submissionDueDate.split('T')[0] : ''
      );
      setPlannedPublishDate(
        editItem.plannedPublishDate ? editItem.plannedPublishDate.split('T')[0] : ''
      );
      setMediaList(
        (editItem.media || []).map(m => ({
          id: m.id,
          fileType: m.fileType,
          fileName: m.fileName,
          fileUrl: m.fileUrl,
          thumbnailUrl: m.thumbnailUrl || undefined,
          fileSize: m.fileSize,
          mimeType: m.mimeType || undefined,
          isExisting: true,
        }))
      );
      setRemovedMediaIds([]);
    } else {
      const initBranchId = permissions?.userBranchId || branches[0]?.id || '';
      const initBranchObj = branches.find(b => b.id === initBranchId);
      const initBranchStaff = staffOptions.filter(
        s =>
          s.branch &&
          (matchBranch(s.branch, initBranchId) ||
            (initBranchObj && matchBranch(s.branch, initBranchObj.name)))
      );
      const selfInBranch = initBranchStaff.find(s => s.id === permissions?.userId);
      const defaultPerson = selfInBranch || initBranchStaff[0];

      setTitle('');
      setBranchId(initBranchId);
      setAssigneeId(defaultPerson?.id || permissions?.userId || '');
      setAssigneeName(defaultPerson?.name || permissions?.userName || '');
      setContentType('SHORT_VIDEO');
      setProductGroup(PRODUCT_GROUPS[0]);
      setObjective(CONTENT_OBJECTIVES[0]);
      setTargetChannels(['Facebook Page สาขา', 'TikTok สาขา']);
      setMediaFormat('9:16');
      setCaption('');
      setDescription('');
      setCallToAction('');
      setReferenceUrl('');
      const today = new Date();
      const threeDays = new Date(today.getTime() + 3 * 86400000);
      const fiveDays = new Date(today.getTime() + 5 * 86400000);
      setSubmissionDueDate(threeDays.toISOString().split('T')[0]);
      setPlannedPublishDate(fiveDays.toISOString().split('T')[0]);
      setMediaList([]);
      setRemovedMediaIds([]);
    }
  }, [isOpen, editItem, permissions, branches, defaultBranchId, staffOptions]);

  if (!isOpen) return null;

  const toggleChannel = (ch: string) => {
    setTargetChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedItems: UploadedMediaDraft[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 50 * 1024 * 1024) {
          Swal.fire({
            icon: 'warning',
            title: 'ไฟล์มีขนาดใหญ่เกินกำหนด',
            text: `ไฟล์ "${file.name}" มีขนาดเกิน 50MB กรุณาบีบอัดหรือแนบลิงก์ในช่อง Reference URL แทน`,
          });
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'uploadsService');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.success && data.url) {
          const mime = file.type || '';
          const fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' = mime.startsWith('video/')
            ? 'VIDEO'
            : mime.startsWith('image/')
            ? 'IMAGE'
            : 'DOCUMENT';

          uploadedItems.push({
            fileType,
            fileName: file.name,
            fileUrl: data.url,
            thumbnailUrl: fileType === 'IMAGE' ? data.url : undefined,
            fileSize: file.size,
            mimeType: mime,
            isExisting: false,
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'อัปโหลดไฟล์ไม่สำเร็จ',
            text: data.error || `ไม่สามารถอัปโหลดไฟล์ ${file.name} ได้`,
          });
        }
      }

      if (uploadedItems.length > 0) {
        setMediaList(prev => [...prev, ...uploadedItems]);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการอัปโหลด',
        text: err?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์อัปโหลดได้',
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveMedia = (idx: number) => {
    const target = mediaList[idx];
    if (target.isExisting && target.id) {
      setRemovedMediaIds(prev => [...prev, target.id!]);
    }
    setMediaList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (actionMode: 'BACKLOG' | 'IN_PROGRESS' | 'PENDING_REVIEW') => {
    if (!title.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุชื่อคอนเทนต์ / หัวข้องาน' });
      return;
    }

    if (!branchId) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกสาขา' });
      return;
    }

    if (actionMode === 'PENDING_REVIEW') {
      if (!caption.trim() && mediaList.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'ข้อมูลยังไม่ครบก่อนส่งตรวจ',
          text: 'กรุณากรอกเนื้อหา Caption หรืออัปโหลดไฟล์สื่อ (ภาพ/วิดีโอ) อย่างน้อย 1 รายการก่อนส่งให้ Marketing ตรวจสอบ',
        });
        return;
      }
      if (!plannedPublishDate) {
        Swal.fire({
          icon: 'warning',
          title: 'กรุณาระบุวันที่วางแผนเผยแพร่',
          text: 'ต้องระบุวันที่วางแผนเผยแพร่ก่อนส่งให้ Marketing ตรวจสอบ',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editItem) {
        const newMediaFiles = mediaList
          .filter(m => !m.isExisting)
          .map(m => ({
            fileType: m.fileType,
            fileName: m.fileName,
            fileUrl: m.fileUrl,
            thumbnailUrl: m.thumbnailUrl,
            fileSize: m.fileSize,
            mimeType: m.mimeType,
          }));

        const res = await updateBranchContent(editItem.id, {
          title,
          branchId,
          assigneeId,
          assigneeName,
          contentType,
          productGroup,
          objective,
          targetChannels,
          mediaFormat,
          caption,
          description,
          callToAction,
          referenceUrl,
          submissionDueDate: submissionDueDate || null,
          plannedPublishDate: plannedPublishDate || null,
          status: actionMode === 'PENDING_REVIEW' ? undefined : actionMode,
          newMediaFiles,
          removedMediaIds,
        });

        if (!res.success || !res.data) {
          Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: res.error });
          return;
        }

        if (actionMode === 'PENDING_REVIEW') {
          const subRes = await submitBranchContentForReview(editItem.id);
          if (subRes.success && subRes.data) {
            Swal.fire({
              icon: 'success',
              title: 'ส่งให้ Marketing ตรวจสอบแล้ว',
              text: `คอนเทนต์ ${subRes.data.contentNo} (V${subRes.data.currentVersion}) ถูกส่งเข้าคิวตรวจเรียบร้อยแล้ว`,
              timer: 2000,
              showConfirmButton: false,
            });
            onSuccess(subRes.data);
            onClose();
            return;
          } else {
            Swal.fire({ icon: 'error', title: 'ส่งตรวจไม่สำเร็จ', text: subRes.error });
            return;
          }
        }

        Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        });
        onSuccess(res.data);
        onClose();
      } else {
        const res = await createBranchContent({
          title,
          branchId,
          assigneeId,
          assigneeName,
          contentType,
          productGroup,
          objective,
          targetChannels,
          mediaFormat,
          caption,
          description,
          callToAction,
          referenceUrl,
          submissionDueDate: submissionDueDate || null,
          plannedPublishDate: plannedPublishDate || null,
          initialStatus: actionMode,
          mediaFiles: mediaList.map(m => ({
            fileType: m.fileType,
            fileName: m.fileName,
            fileUrl: m.fileUrl,
            thumbnailUrl: m.thumbnailUrl,
            fileSize: m.fileSize,
            mimeType: m.mimeType,
          })),
        });

        if (res.success && res.data) {
          Swal.fire({
            icon: 'success',
            title:
              actionMode === 'PENDING_REVIEW'
                ? 'สร้างและส่งตรวจสำเร็จ'
                : 'สร้างคอนเทนต์สำเร็จ',
            text: `รหัสคอนเทนต์: ${res.data.contentNo}`,
            timer: 2000,
            showConfirmButton: false,
          });
          onSuccess(res.data);
          onClose();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'ไม่สามารถสร้างคอนเทนต์ได้',
            text: res.error,
          });
        }
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err?.message || 'ไม่สามารถบันทึกข้อมูลได้',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white flex items-center justify-between sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
              {editItem ? (
                <>
                  <span>แก้ไขคอนเทนต์สาขา: {editItem.contentNo}</span>
                  <span className="px-2 py-0.5 text-xs bg-white/20 rounded-lg font-mono">
                    V{editItem.currentVersion}
                  </span>
                </>
              ) : (
                'สร้างคอนเทนต์จากสาขาใหม่ (Create Branch Content)'
              )}
            </h3>
            <p className="text-xs text-red-100 mt-0.5">
              กรอกแผนคอนเทนต์ แนบสื่อภาพ/วิดีโอ และส่งให้ทีมการตลาดส่วนกลาง (HQ) ตรวจสอบก่อนเผยแพร่
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800">
          {/* Section 1: ตัวตนงาน & สาขา */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 size={16} className="text-red-600" />
              1. ข้อมูลสาขาและผู้รับผิดชอบ (Identity & Ownership)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Branch Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  สาขา (Branch Master) <span className="text-red-500">*</span>
                </label>
                <select
                  value={branchId}
                  disabled={!permissions?.canViewAllBranches && !!permissions?.userBranchId}
                  onChange={e => {
                    const nextBranchId = e.target.value;
                    setBranchId(nextBranchId);
                    setAssigneeSearch('');
                    const nextBranchObj = branches.find(b => b.id === nextBranchId);
                    const nextStaff = staffOptions.filter(
                      s =>
                        s.branch &&
                        (matchBranch(s.branch, nextBranchId) ||
                          (nextBranchObj && matchBranch(s.branch, nextBranchObj.name)))
                    );
                    const firstPerson = nextStaff[0];
                    if (firstPerson) {
                      setAssigneeId(firstPerson.id);
                      setAssigneeName(firstPerson.name);
                    } else {
                      setAssigneeId('');
                      setAssigneeName('');
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-100 disabled:text-slate-600"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      สาขา{b.name} ({b.code})
                    </option>
                  ))}
                </select>
                {!permissions?.canViewAllBranches && permissions?.userBranchName && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    * ระบบล็อกสาขาตามสิทธิ์บัญชีของคุณ ({permissions.userBranchName})
                  </p>
                )}
              </div>

              {/* Creator */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ผู้สร้างรายการ
                </label>
                <input
                  type="text"
                  disabled
                  value={editItem?.createdByName || permissions?.userName || ''}
                  className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium"
                />
              </div>

              {/* Assignee (Searchable & Filtered to Selected Branch Only, with Nickname in Parentheses) */}
              <div ref={assigneeDropdownRef} className="relative">
                <label className="block font-semibold text-slate-700 mb-1">
                  ผู้รับผิดชอบหลัก (เฉพาะพนักงานในสาขานี้) <span className="text-red-500">*</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsAssigneeOpen(prev => !prev)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-medium text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 hover:border-slate-400 transition-colors"
                >
                  <span className="truncate text-slate-800">
                    {branchStaffOptions.find(s => s.id === assigneeId)?.name ||
                      assigneeName ||
                      'เลือกผู้รับผิดชอบในสาขา...'}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`text-slate-400 shrink-0 transition-transform ${
                      isAssigneeOpen ? 'rotate-180 text-red-600' : ''
                    }`}
                  />
                </button>

                {isAssigneeOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden">
                    <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                      <div className="relative flex items-center">
                        <Search
                          size={14}
                          className="absolute left-2.5 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          autoFocus
                          value={assigneeSearch}
                          onChange={e => setAssigneeSearch(e.target.value)}
                          placeholder="พิมพ์ค้นหาชื่อ หรือ (ชื่อเล่น)..."
                          className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        {assigneeSearch && (
                          <button
                            type="button"
                            onClick={() => setAssigneeSearch('')}
                            className="absolute right-2 text-slate-400 hover:text-slate-600"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                      {filteredBranchStaff.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-slate-400">
                          ไม่พบรายชื่อพนักงานในสาขานี้ที่ตรงกับคำค้นหา
                        </div>
                      ) : (
                        filteredBranchStaff.map(person => {
                          const isSelected = person.id === assigneeId;
                          return (
                            <button
                              key={person.id}
                              type="button"
                              onClick={() => {
                                setAssigneeId(person.id);
                                setAssigneeName(person.name);
                                setIsAssigneeOpen(false);
                                setAssigneeSearch('');
                              }}
                              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                                isSelected
                                  ? 'bg-red-50 text-red-700 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <User
                                  size={13}
                                  className={
                                    isSelected ? 'text-red-600 shrink-0' : 'text-slate-400 shrink-0'
                                  }
                                />
                                <span className="truncate">
                                  {person.name}
                                  {person.id === permissions?.userId ? ' • ฉัน' : ''}
                                </span>
                              </div>
                              {isSelected && (
                                <Check size={14} className="text-red-600 shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Title */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อคอนเทนต์ / หัวข้องาน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="เช่น รีวิวส่งมอบงานติดตั้งโซลาร์รูฟท็อป 10kW ลูกค้าขอนแก่น / แนะนำโปรโมชั่นอินเวอร์เตอร์ประจำเดือน"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Section 2: แผนคอนเทนต์ */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers size={16} className="text-red-600" />
              2. แผนคอนเทนต์และช่องทาง (Content Plan)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ประเภทคอนเทนต์ (Content Type) <span className="text-red-500">*</span>
                </label>
                <select
                  value={contentType}
                  onChange={e => setContentType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {CONTENT_TYPES.map(ct => (
                    <option key={ct.value} value={ct.value}>
                      {ct.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  กลุ่มสินค้า (Product Group) <span className="text-red-500">*</span>
                </label>
                <select
                  value={productGroup}
                  onChange={e => setProductGroup(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {PRODUCT_GROUPS.map(pg => (
                    <option key={pg} value={pg}>
                      {pg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  วัตถุประสงค์ (Objective)
                </label>
                <select
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {CONTENT_OBJECTIVES.map(obj => (
                    <option key={obj} value={obj}>
                      {obj}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ขนาด/สัดส่วนสื่อ (Format)
                </label>
                <select
                  value={mediaFormat}
                  onChange={e => setMediaFormat(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {MEDIA_FORMATS.map(fmt => (
                    <option key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Channels Multi-Select */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                ช่องทางที่จะนำไปเผยแพร่ (เลือกได้มากกว่า 1 ช่องทาง) <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TARGET_CHANNELS.map(ch => {
                  const selected = targetChannels.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        selected
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '}
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: เนื้อหา Caption & สื่อแนบ */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText size={16} className="text-red-600" />
              3. รายละเอียดเนื้อหาและสื่อแนบ (Caption & Media Assets)
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  ข้อความโพสต์ / แคปชั่น (Caption)
                </label>
                <span className="text-[11px] text-slate-400">
                  {caption.length.toLocaleString()} ตัวอักษร
                </span>
              </div>
              <textarea
                rows={5}
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="พิมพ์แคปชั่นโพสต์จริง พร้อมแฮชแท็ก (#TERAGroup #โซลาร์เซลล์) และเบอร์ติดต่อสาขา..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ข้อความกระตุ้นการตัดสินใจ (Call to Action - CTA)
                </label>
                <input
                  type="text"
                  value={callToAction}
                  onChange={e => setCallToAction(e.target.value)}
                  placeholder="เช่น ทักแชทรับประเมินหน้างานฟรี / โทรติดต่อสาขาขอนแก่น 08x-xxx-xxxx"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ลิงก์อ้างอิง / ลิงก์ไฟล์ขนาดใหญ่สำรอง (Reference / Google Drive URL)
                </label>
                <input
                  type="url"
                  value={referenceUrl}
                  onChange={e => setReferenceUrl(e.target.value)}
                  placeholder="https://drive.google.com/... หรือลิงก์ตัวอย่างงาน"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                คำอธิบายเพิ่มเติม / บรีฟเบื้องหลังถึงทีมการตลาด
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="อธิบายบริบทของภาพ/วิดีโอ หรือสิ่งที่ต้องการให้ Marketing ช่วยดูเป็นพิเศษ..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* File Upload Area */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                อัปโหลดภาพ / วิดีโอ / สื่อแนบ (รองรับหลายไฟล์ สูงสุด 50MB ต่อไฟล์)
              </label>

              <label className="flex flex-col items-center justify-center w-full p-5 border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl bg-white hover:bg-red-50/30 cursor-pointer transition-all">
                <Upload size={24} className="text-red-500 mb-1.5" />
                <span className="font-bold text-slate-700 text-xs">
                  {isUploading ? 'กำลังอัปโหลดไฟล์...' : 'คลิกเพื่อเลือกไฟล์รูปภาพ (JPG, PNG) หรือวิดีโอ (MP4)'}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  สามารถเลือกพร้อมกันหลายไฟล์ได้ (จะถูกผูกกับ Version ปัจจุบันโดยอัตโนมัติ)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf"
                  disabled={isUploading}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Media Preview Grid */}
              {mediaList.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                  {mediaList.map((m, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                    >
                      <div className="h-28 bg-slate-900 flex items-center justify-center overflow-hidden">
                        {m.fileType === 'VIDEO' ? (
                          <video
                            src={m.fileUrl}
                            className="w-full h-full object-cover"
                            controls
                            preload="metadata"
                          />
                        ) : m.fileType === 'IMAGE' ? (
                          <img
                            src={m.fileUrl}
                            alt={m.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText size={28} className="text-slate-300" />
                        )}
                      </div>
                      <div className="p-2 flex items-center justify-between gap-1 bg-white">
                        <span className="text-[10px] font-medium text-slate-700 truncate">
                          {m.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors shrink-0"
                          title="ลบไฟล์นี้"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: กำหนดเวลา */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Calendar size={16} className="text-red-600" />
              4. กำหนดส่งตรวจและวันเผยแพร่ (Schedule)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  วันที่ต้องส่งตรวจ (Submission Due Date)
                </label>
                <input
                  type="date"
                  value={submissionDueDate}
                  onChange={e => setSubmissionDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  วันที่วางแผนเผยแพร่จริง (Planned Publish Date) <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={plannedPublishDate}
                  onChange={e => setPlannedPublishDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            disabled={isSubmitting || isUploading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
          >
            ยกเลิก
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting || isUploading}
              onClick={() => handleSave('BACKLOG')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
            >
              เก็บเป็นไอเดีย (Backlog)
            </button>

            <button
              type="button"
              disabled={isSubmitting || isUploading}
              onClick={() => handleSave('IN_PROGRESS')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Save size={14} />
              บันทึกเป็น Draft (In Progress)
            </button>

            <button
              type="button"
              disabled={isSubmitting || isUploading}
              onClick={() => handleSave('PENDING_REVIEW')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md shadow-red-500/20 transition-all"
            >
              <Send size={14} />
              ส่งให้ Marketing ตรวจสอบ (Submit for Review)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

