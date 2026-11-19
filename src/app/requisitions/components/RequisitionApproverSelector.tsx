'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, UserCheck, X } from 'lucide-react';
import { canSelfApproveRequisition } from '@/app/lib/requisitionUtils';

export interface ApproverUserOption {
  id: string;
  fullName: string;
}

interface RequisitionApproverSelectorProps {
  users: ApproverUserOption[];
  currentUserId?: string | null;
  currentUserName?: string | null;
  approverId: string;
  approverSearch: string;
  onApproverChange: (id: string, fullName: string) => void;
  onSearchChange: (search: string) => void;
  selfApproveChecked: boolean;
  onSelfApproveChange: (checked: boolean) => void;
  allowSelfApprove?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  fieldClassName?: string;
}

/**
 * Shared approver combobox supporting picking oneself as approver
 * and immediately applying the requester signature as the approver signature.
 */
export default function RequisitionApproverSelector({
  users,
  currentUserId,
  currentUserName,
  approverId,
  approverSearch,
  onApproverChange,
  onSearchChange,
  selfApproveChecked,
  onSelfApproveChange,
  allowSelfApprove = true,
  isOpen: controlledOpen,
  onOpenChange,
  fieldClassName = 'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm font-medium outline-none transition-all',
}: RequisitionApproverSelectorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChangeRef.current?.(next);
  };

  useEffect(() => {
    function handleClickOutside(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setInternalOpen(false);
        onOpenChangeRef.current?.(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const filteredUsers = users.filter((u) =>
    u.fullName.toLowerCase().includes(approverSearch.toLowerCase())
  );

  const selfUser = currentUserId
    ? users.find((u) => u.id === currentUserId) ||
      (currentUserName ? { id: currentUserId, fullName: currentUserName } : null)
    : null;
  const isSelfSelected = canSelfApproveRequisition(currentUserId, approverId);

  return (
    <div className="max-w-md" ref={containerRef}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <label className="block text-xs font-bold text-slate-700">
          เลือกหัวหน้า / ผู้มีอำนาจอนุมัติ <span className="text-red-500">*</span>
        </label>
        {allowSelfApprove && selfUser && (
          <button
            type="button"
            onClick={() => {
              onApproverChange(selfUser.id, selfUser.fullName);
              onSelfApproveChange(true);
              setOpen(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
              isSelfSelected
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200'
            }`}
          >
            {isSelfSelected ? '✓ ใช้ชื่อตัวเองเป็นผู้อนุมัติ' : '+ ใช้ชื่อตัวเองเป็นผู้อนุมัติ'}
          </button>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={approverSearch}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setOpen(true);
            if (approverId) onApproverChange('', e.target.value);
          }}
          onFocus={() => setOpen(true)}
          placeholder="พิมพ์เพื่อค้นหาผู้อนุมัติ (PM / หัวหน้าช่าง / ผู้จัดการ / ชื่อตัวเอง)..."
          className={`${fieldClassName} pr-10 focus:ring-2 focus:ring-red-500/20 focus:border-red-500`}
        />
        {approverSearch && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onApproverChange('', '');
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg"
            aria-label="ล้างค่าผู้อนุมัติ"
          >
            <X size={16} />
          </button>
        )}
        {isOpen && (
          <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const isMe = Boolean(currentUserId && u.id === currentUserId);
                return (
                  <div
                    key={u.id}
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm flex items-center justify-between gap-2 ${
                      approverId === u.id ? 'bg-red-50/70 text-red-900 font-bold' : ''
                    }`}
                    onClick={() => {
                      onApproverChange(u.id, u.fullName);
                      if (isMe) onSelfApproveChange(true);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold truncate">{u.fullName}</span>
                      {isMe && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                          ตัวเอง
                        </span>
                      )}
                    </div>
                    {approverId === u.id && <Check size={15} className="text-red-600 shrink-0" />}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-3 text-slate-400 text-xs">ไม่พบรายชื่อผู้อนุมัติ</div>
            )}
          </div>
        )}
      </div>

      {approverId ? (
        <p className="text-xs text-emerald-700 font-semibold mt-1.5 inline-flex items-center gap-1">
          <UserCheck size={14} /> เลือกผู้อนุมัติแล้ว: {approverSearch}
        </p>
      ) : (
        <p className="text-[11px] text-slate-400 mt-1.5">
          ระบบจะส่งแจ้งเตือนไปยังผู้อนุมัติโดยอัตโนมัติ (สามารถเลือกชื่อตัวเองเป็นผู้ขอเบิกและผู้อนุมัติได้)
        </p>
      )}

      {allowSelfApprove && isSelfSelected && (
        <label className="mt-2.5 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 cursor-pointer transition-colors hover:bg-emerald-50">
          <input
            type="checkbox"
            checked={selfApproveChecked}
            onChange={(e) => onSelfApproveChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-emerald-600 border-emerald-300 focus:ring-emerald-500"
          />
          <div className="text-xs leading-snug">
            <div className="font-bold text-emerald-900">
              ใช้ลายเซ็นผู้ขอเบิกลงนามอนุมัติทันที (ผู้ขอเบิกและผู้อนุมัติเป็นคนเดียวกัน)
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              ระบบจะใช้ลายมือชื่อของผู้ขอเบิกลงนามในช่องผู้อนุมัติให้อัตโนมัติ และส่งต่อเข้าสโตร์ทันที
            </div>
          </div>
        </label>
      )}
    </div>
  );
}
