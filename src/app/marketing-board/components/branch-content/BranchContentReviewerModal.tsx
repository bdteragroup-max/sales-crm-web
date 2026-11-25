'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  ShieldCheck,
  Search,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  UserCheck,
  Loader2,
  Users,
  Save,
  Info,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  getMarketingReviewerAssignments,
  saveMarketingReviewerAssignments,
} from '@/app/actions/branchContent';
import type { BranchContentReviewerAssignment } from '@/app/lib/branchContentTypes';

interface BranchContentReviewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
}

export default function BranchContentReviewerModal({
  isOpen,
  onClose,
  onSaved,
}: BranchContentReviewerModalProps) {
  const [rows, setRows] = useState<BranchContentReviewerAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const fetchRows = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await getMarketingReviewerAssignments();
        if (cancelled) return;
        if (!res.success) {
          setLoadError(res.error || 'ไม่สามารถโหลดรายชื่อผู้ตรวจสอบได้');
          return;
        }
        setRows(res.assignments || []);
      } catch (err: unknown) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchRows();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.fullName, r.nickname || '', r.employeeId, r.role, r.position || '', r.branchName || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, searchQuery]);

  const managerRows = useMemo(
    () => filteredRows.filter(r => r.isMarketingManager),
    [filteredRows]
  );
  const assignableRows = useMemo(
    () => filteredRows.filter(r => !r.isMarketingManager),
    [filteredRows]
  );

  const summary = useMemo(() => {
    const assignableAll = rows.filter(r => !r.isMarketingManager);
    return {
      totalTeam: assignableAll.length,
      assignedCount: assignableAll.filter(r => r.isAssigned).length,
      approveCount: assignableAll.filter(r => r.isAssigned && r.canApprove).length,
    };
  }, [rows]);

  const toggleMasterAssign = (userId: string, checked: boolean) => {
    setRows(prev =>
      prev.map(r => {
        if (r.userId !== userId || r.isMarketingManager) return r;
        if (checked) {
          return {
            ...r,
            isAssigned: true,
            canReviewComment: true,
          };
        }
        return {
          ...r,
          isAssigned: false,
          canReviewComment: false,
          canRequestRevision: false,
          canApprove: false,
        };
      })
    );
  };

  const togglePermField = (
    userId: string,
    field: 'canReviewComment' | 'canRequestRevision' | 'canApprove',
    checked: boolean
  ) => {
    setRows(prev =>
      prev.map(r => {
        if (r.userId !== userId || r.isMarketingManager) return r;
        const next = { ...r, [field]: checked };
        const hasAny = Boolean(
          next.canReviewComment || next.canRequestRevision || next.canApprove
        );
        return {
          ...next,
          isAssigned: hasAny,
        };
      })
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = rows
        .filter(r => !r.isMarketingManager)
        .map(r => ({
          userId: r.userId,
          isAssigned: r.isAssigned,
          canReviewComment: r.canReviewComment,
          canRequestRevision: r.canRequestRevision,
          canApprove: r.canApprove,
        }));

      const res = await saveMarketingReviewerAssignments(payload);
      if (!res.success) {
        Swal.fire({
          icon: 'error',
          title: 'บันทึกสิทธิ์ไม่สำเร็จ',
          text: res.error || 'กรุณาลองใหม่อีกครั้ง',
        });
        return;
      }

      if (res.assignments) {
        setRows(res.assignments);
      }
      if (onSaved) {
        await onSaved();
      }
      onClose();
      Swal.fire({
        icon: 'success',
        title: 'อัปเดตสิทธิ์ผู้ตรวจสอบแล้ว',
        text: 'สิทธิ์ตรวจ คอมเมนต์ ส่งกลับแก้ไข และอนุมัติ มีผลทันที',
        timer: 1800,
        showConfirmButton: false,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 text-[#ff2301] flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                จัดการผู้ตรวจสอบและอนุมัติ (Marketing Reviewer Assignment)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                เลือกผู้ใช้งาน Active จากทีม Marketing และกำหนดสิทธิ์รายบุคคล (สิทธิ์ Approve ต้องเลือกโดยชัดเจน)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </div>

        {/* BRD Rule Notice & Search / Summary Bar */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="rounded-2xl bg-white border border-slate-200/90 px-3.5 py-2.5 flex items-start gap-2.5 text-[11px] text-slate-600">
            <Info size={15} className="text-red-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-slate-800">หลักการสิทธิ์ตาม BRD:</strong>{' '}
              ผู้ได้รับมอบหมายจะใช้ขอบเขตงานทุกสาขาเป็นค่าเริ่มต้น (หากมี Branch Permission จำกัดสาขาจะใช้สิทธิ์เดิม ไม่ขยายสิทธิ์อัตโนมัติ) • ผู้ได้รับมอบหมาย
              <strong> ไม่สามารถมอบสิทธิ์ต่อได้</strong> • ผู้จัดการการตลาดยังคงตรวจและอนุมัติได้ทั้งหมด
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, ชื่อเล่น, รหัสพนักงาน หรือตำแหน่งทีม Marketing..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold shrink-0">
              <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 inline-flex items-center gap-1">
                <Users size={12} className="text-slate-500" />
                ทีม Marketing: {summary.totalTeam} คน
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 inline-flex items-center gap-1">
                <UserCheck size={12} />
                มอบหมายแล้ว: {summary.assignedCount} คน
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 size={12} />
                สิทธิ์ Approve: {summary.approveCount} คน
              </span>
            </div>
          </div>
        </div>

        {/* Body List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs font-semibold">
              <Loader2 size={24} className="animate-spin text-[#ff2301]" />
              <span>กำลังโหลดรายชื่อทีม Marketing...</span>
            </div>
          ) : loadError ? (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-700">
              {loadError}
            </div>
          ) : (
            <>
              {/* Assignable Marketing Staff */}
              <div className="space-y-2.5">
                <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                  <span>สมาชิกทีม Marketing (เลือกมอบหมายและกำหนดสิทธิ์รายบุคคล)</span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    แสดง {assignableRows.length} รายชื่อ
                  </span>
                </div>

                {assignableRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400 font-medium">
                    ไม่พบรายชื่อทีม Marketing ที่ตรงกับคำค้นหา
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {assignableRows.map(row => (
                      <div
                        key={row.userId}
                        className={`rounded-2xl border p-3.5 transition-all ${
                          row.isAssigned
                            ? 'bg-white border-indigo-200 shadow-2xs ring-1 ring-indigo-500/10'
                            : 'bg-slate-50/70 border-slate-200/80 hover:bg-white'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          {/* Left: User Identity */}
                          <div className="flex items-start gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={row.isAssigned}
                              onChange={e => toggleMasterAssign(row.userId, e.target.checked)}
                              aria-label={`มอบหมายสิทธิ์ให้ ${row.fullName}`}
                              className="mt-1 w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 shrink-0 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                  {row.fullName}
                                  {row.nickname ? ` (${row.nickname})` : ''}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600">
                                  {row.employeeId}
                                </span>
                                {row.isAssigned ? (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold">
                                    มีสิทธิ์ตรวจสอบ
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold">
                                    ดูอย่างเดียว (ยังไม่มอบหมาย)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                                <span>{row.position || row.role}</span>
                                {row.branchName && <span>• {row.branchName}</span>}
                                {row.assignedByName && row.isAssigned && (
                                  <span className="text-indigo-600">
                                    • มอบหมายโดย {row.assignedByName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Granular 3 Checkboxes */}
                          <div className="flex flex-wrap items-center gap-2 lg:justify-end pl-7 lg:pl-0 shrink-0">
                            <label
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-colors select-none ${
                                row.canReviewComment
                                  ? 'bg-purple-50 border-purple-300 text-purple-900'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={row.canReviewComment}
                                onChange={e =>
                                  togglePermField(
                                    row.userId,
                                    'canReviewComment',
                                    e.target.checked
                                  )
                                }
                                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                              />
                              <MessageSquare size={12} />
                              <span>ตรวจ &amp; คอมเมนต์</span>
                            </label>

                            <label
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-colors select-none ${
                                row.canRequestRevision
                                  ? 'bg-orange-50 border-orange-300 text-orange-900'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={row.canRequestRevision}
                                onChange={e =>
                                  togglePermField(
                                    row.userId,
                                    'canRequestRevision',
                                    e.target.checked
                                  )
                                }
                                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                              />
                              <RotateCcw size={12} />
                              <span>ส่งกลับแก้ไข</span>
                            </label>

                            <label
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-colors select-none ${
                                row.canApprove
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                              title="สิทธิ์ Approve ต้องได้รับการเลือกโดยชัดเจนจากผู้จัดการการตลาด"
                            >
                              <input
                                type="checkbox"
                                checked={row.canApprove}
                                onChange={e =>
                                  togglePermField(row.userId, 'canApprove', e.target.checked)
                                }
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <CheckCircle2 size={12} />
                              <span>อนุมัติ (Approve)</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Managers Reference List */}
              {managerRows.length > 0 && (
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500">
                    ผู้จัดการการตลาด / ผู้ดูแลระบบ (มีสิทธิ์ตรวจ สั่งแก้ไข อนุมัติ และจัดการผู้ตรวจครบทั้งหมดโดยตำแหน่ง)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {managerRows.map(mgr => (
                      <div
                        key={mgr.userId}
                        className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">
                            {mgr.fullName}
                            {mgr.nickname ? ` (${mgr.nickname})` : ''}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {mgr.employeeId} • {mgr.position || mgr.role}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold shrink-0">
                          สิทธิ์เต็ม
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            การแก้ไขและถอนสิทธิ์จะมีผลกับผู้ใช้งานที่เลือกทันทีหลังกดบันทึก
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || isSaving}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#ff2301] hover:bg-red-600 text-white text-xs font-extrabold shadow-sm disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              <span>บันทึกสิทธิ์ผู้ตรวจสอบ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
