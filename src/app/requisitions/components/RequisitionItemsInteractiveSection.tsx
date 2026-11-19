'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Hash,
  Layers,
  ListChecks,
  Loader2,
  MessageSquare,
  Plus,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { confirmUsedRequisitionItems } from '@/app/actions/requisitions';
import {
  type EditableRequisitionItem,
  createEmptyRequisitionItem,
  getNonReturnableBadgeClass,
  getNonReturnableLabel,
  getUnitSuggestionsForRequisitionType,
  isNonReturnableRequisitionType,
  sanitizeRequisitionItemsForSave,
} from '@/app/lib/requisitionUtils';

export interface RequisitionItemsDraftState {
  keptItems: EditableRequisitionItem[];
  removedCount: number;
  addedCount: number;
  hasBlankNewError: boolean;
  hasChanges: boolean;
}

export interface RequisitionItemsCommittedPayload {
  items: EditableRequisitionItem[];
  status?: string;
  storeStaffSignatureUrl?: string | null;
  storeStaffName?: string | null;
  dispensedAt?: string | null;
}

interface InteractiveItemRow {
  key: string;
  item: EditableRequisitionItem;
  checked: boolean;
  isNew: boolean;
}

interface RequisitionItemsInteractiveSectionProps {
  requisition: {
    id: string;
    requisitionType?: string | null;
    status: string;
    projectName?: string | null;
    approverSignatureUrl?: string | null;
    storeStaffSignatureUrl?: string | null;
    items?: EditableRequisitionItem[];
  };
  canEditItems: boolean;
  variant?: 'page' | 'modal';
  effectiveSavedStoreSig?: string | null;
  pullStoreSignature?: boolean;
  onTogglePullStoreSignature?: (checked: boolean) => void;
  hideActionBar?: boolean;
  hidePdfButton?: boolean;
  sectionId?: string;
  onCommitted?: (result: RequisitionItemsCommittedPayload) => void;
  onSelectionStateChange?: (state: RequisitionItemsDraftState) => void;
}

export function openPreparingPdfTab(removedCount: number, addedCount: number): Window | null {
  const pdfWin = window.open('', '_blank');
  if (!pdfWin) return null;
  const details: string[] = [];
  if (addedCount > 0) details.push(`เพิ่ม ${addedCount} รายการ`);
  if (removedCount > 0) details.push(`ลบรายการที่ไม่ใช้ ${removedCount} รายการ`);
  const subText = details.length > 0 ? details.join(' • ') : 'กำลังบันทึกสถานะใบเบิก';

  try {
    pdfWin.document.write(`
      <!DOCTYPE html>
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>กำลังจัดเตรียมเอกสาร PDF...</title>
          <style>
            body { margin: 0; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; text-align: center; padding: 20px; }
            .spinner { width: 38px; height: 38px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.75s linear infinite; margin-bottom: 14px; }
            @keyframes spin { to { transform: rotate(360deg); } }
            .title { font-size: 15px; font-weight: 700; }
            .sub { font-size: 12px; color: #64748b; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <div class="title">กำลังอัปเดตรายการที่ใช้จริงและสร้างหน้า PDF...</div>
          <div class="sub">${subText}</div>
        </body>
      </html>
    `);
    pdfWin.document.close();
  } catch {
    // ignore cross-window document edge cases
  }
  return pdfWin;
}

export default function RequisitionItemsInteractiveSection({
  requisition,
  canEditItems,
  variant = 'page',
  effectiveSavedStoreSig = null,
  pullStoreSignature = false,
  onTogglePullStoreSignature,
  hideActionBar = false,
  hidePdfButton = false,
  sectionId,
  onCommitted,
  onSelectionStateChange,
}: RequisitionItemsInteractiveSectionProps) {
  const router = useRouter();
  const initialItems = useMemo(
    () => (Array.isArray(requisition.items) ? requisition.items : []),
    [requisition.items]
  );

  const [rows, setRows] = useState<InteractiveItemRow[]>(() =>
    initialItems.map((item, idx) => ({
      key: `orig_${idx}`,
      item: { ...item },
      checked: true,
      isNew: false,
    }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const newSeqRef = useRef(0);
  const pendingFocusKeyRef = useRef<string | null>(null);
  const detailInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const selectionCallbackRef = useRef(onSelectionStateChange);

  useEffect(() => {
    selectionCallbackRef.current = onSelectionStateChange;
  }, [onSelectionStateChange]);

  useEffect(() => {
    if (pendingFocusKeyRef.current) {
      const target = detailInputRefs.current[pendingFocusKeyRef.current];
      if (target) {
        target.focus();
        pendingFocusKeyRef.current = null;
      }
    }
  }, [rows]);

  const draftState: RequisitionItemsDraftState = useMemo(() => {
    const removedCount = rows.filter((r) => !r.isNew && !r.checked).length;
    const validAddedRows = rows.filter(
      (r) => r.isNew && r.checked && String(r.item.detail || '').trim().length > 0
    );
    const hasBlankNewError = rows.some(
      (r) => r.isNew && r.checked && String(r.item.detail || '').trim().length === 0
    );
    const keptItems = sanitizeRequisitionItemsForSave(
      rows.filter((r) => r.checked).map((r) => r.item)
    );
    const addedCount = validAddedRows.length;
    const hasChanges = removedCount > 0 || addedCount > 0;

    return {
      keptItems,
      removedCount,
      addedCount,
      hasBlankNewError,
      hasChanges,
    };
  }, [rows]);

  useEffect(() => {
    selectionCallbackRef.current?.(draftState);
  }, [draftState]);

  const isBorrow = requisition.requisitionType === 'BORROW_EQUIPMENT';
  const isClaim = requisition.requisitionType === 'CLAIM';
  const showSerialCol = isBorrow || isClaim;
  const unitSuggestions = useMemo(
    () => getUnitSuggestionsForRequisitionType(requisition.requisitionType),
    [requisition.requisitionType]
  );
  const datalistId = `req-units-${requisition.id}`;

  const toggleRowCheck = (rowKey: string, nextChecked?: boolean) => {
    if (!canEditItems) return;
    setRows((prev) =>
      prev.map((row) =>
        row.key === rowKey
          ? { ...row, checked: nextChecked !== undefined ? nextChecked : !row.checked }
          : row
      )
    );
  };

  const handleAddProduct = () => {
    if (!canEditItems) return;
    newSeqRef.current += 1;
    const nextKey = `new_${newSeqRef.current}`;
    pendingFocusKeyRef.current = nextKey;
    setRows((prev) => [
      ...prev,
      {
        key: nextKey,
        item: createEmptyRequisitionItem(requisition.requisitionType, requisition.projectName),
        checked: true,
        isNew: true,
      },
    ]);
  };

  const handleRemoveNewRow = (rowKey: string) => {
    setRows((prev) => prev.filter((r) => r.key !== rowKey));
  };

  const handleUpdateNewRowField = (
    rowKey: string,
    field: keyof EditableRequisitionItem,
    value: string | number
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.key === rowKey
          ? {
              ...row,
              item: {
                ...row.item,
                [field]: value,
              },
            }
          : row
      )
    );
  };

  const validateBeforeSave = (): boolean => {
    if (draftState.hasBlankNewError) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกชื่อสินค้าที่เพิ่มใหม่ให้ครบถ้วน',
        text: 'กรอกรายละเอียดสินค้าที่เพิ่มใหม่ หรือเอาเครื่องหมายถูก/กดลบแถวที่ว่างออก',
      });
      return false;
    }
    if (draftState.keptItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาติ๊กสิ่งที่ใช้จริงอย่างน้อย 1 รายการ',
        text: 'หากไม่ได้เบิกทุกรายการเลย กรุณาปฏิเสธหรือลบใบเบิกแทน',
      });
      return false;
    }
    return true;
  };

  const commitItems = async (openPdfAfter: boolean) => {
    if (!validateBeforeSave()) return;

    const pdfUrl = `/requisitions/${requisition.id}/pdf`;
    const sigToApply =
      !requisition.storeStaffSignatureUrl && pullStoreSignature && effectiveSavedStoreSig
        ? effectiveSavedStoreSig
        : undefined;

    if (!draftState.hasChanges && !sigToApply) {
      if (openPdfAfter) {
        window.open(pdfUrl, '_blank');
      }
      return;
    }

    const pdfWin = openPdfAfter
      ? openPreparingPdfTab(draftState.removedCount, draftState.addedCount)
      : null;

    setIsSaving(true);
    try {
      const res = await confirmUsedRequisitionItems(requisition.id, {
        keptItems: draftState.keptItems,
        storeStaffSignatureUrl: sigToApply,
      });

      if (res.success) {
        const committedItems = res.items || draftState.keptItems;
        setRows(
          committedItems.map((item, idx) => ({
            key: `orig_${idx}_${Date.now()}`,
            item: { ...item },
            checked: true,
            isNew: false,
          }))
        );

        onCommitted?.({
          items: committedItems,
          status: res.status,
          storeStaffSignatureUrl: res.storeStaffSignatureUrl,
          storeStaffName: res.storeStaffName,
          dispensedAt: res.dispensedAt,
        });

        if (openPdfAfter) {
          if (pdfWin && !pdfWin.closed) {
            pdfWin.location.replace(pdfUrl);
          } else {
            window.location.href = pdfUrl;
          }
        }

        const msgParts: string[] = [];
        if (draftState.addedCount > 0) msgParts.push(`เพิ่ม ${draftState.addedCount} รายการ`);
        if (draftState.removedCount > 0) msgParts.push(`ลบที่ไม่ใช้ ${draftState.removedCount} รายการ`);

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: msgParts.length > 0 ? `บันทึกรายการสำเร็จ (${msgParts.join(', ')})` : 'บันทึกรายการเรียบร้อยแล้ว',
          text: openPdfAfter ? `แสดงหน้า PDF ทั้งหมด ${committedItems.length} รายการ` : undefined,
          showConfirmButton: false,
          timer: 2600,
        });

        router.refresh();
      } else {
        if (pdfWin && !pdfWin.closed) pdfWin.close();
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถบันทึกรายการในใบเบิกได้',
        });
      }
    } catch (e: unknown) {
      if (pdfWin && !pdfWin.closed) pdfWin.close();
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e instanceof Error ? e.message : 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sectionTitle = isClaim
    ? 'รายการสินค้า / อะไหล่ที่เบิกเคลม'
    : isBorrow
    ? 'รายการเครื่องมือ / อุปกรณ์ที่ยืม'
    : 'รายการวัสดุ / อุปกรณ์';

  const wrapperClass =
    variant === 'modal'
      ? 'space-y-2.5'
      : 'bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden';

  const headerBarClass =
    variant === 'modal'
      ? 'flex flex-wrap items-center justify-between gap-2'
      : 'px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2';

  const existingCount = rows.filter((r) => !r.isNew).length;

  return (
    <section id={sectionId} className={wrapperClass}>
      <datalist id={datalistId}>
        {unitSuggestions.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      {/* Toolbar Header */}
      <div className={headerBarClass}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#ff2301] shrink-0" />
            <span>{sectionTitle}</span>
          </h3>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
            {rows.length} รายการ
          </span>
          {canEditItems && (
            <>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                ใช้จริง {draftState.keptItems.length}/{rows.length}
              </span>
              {draftState.addedCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                  + เพิ่มใหม่ {draftState.addedCount}
                </span>
              )}
              {draftState.removedCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                  ลบอัตโนมัติ {draftState.removedCount}
                </span>
              )}
            </>
          )}
        </div>

        {canEditItems && (
          <div className="flex flex-wrap items-center gap-1.5">
            {rows.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setRows((prev) => prev.map((r) => ({ ...r, checked: true })))
                  }
                  className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
                >
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRows((prev) => prev.map((r) => ({ ...r, checked: false })))
                  }
                  className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold transition-colors"
                >
                  ล้างที่เลือก
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleAddProduct}
              className="h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มสินค้า</span>
            </button>
          </div>
        )}
      </div>

      {/* Helper Banner */}
      {canEditItems && (
        <div
          className={
            variant === 'modal'
              ? 'px-3 py-2 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 font-medium space-y-1'
              : 'px-4 sm:px-6 py-2.5 bg-indigo-50/70 border-b border-indigo-100/80 space-y-1'
          }
        >
          <p className="text-[11px] sm:text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
            <ListChecks size={15} className="text-indigo-600 shrink-0" />
            <span>
              ติ๊กเครื่องหมายถูกเฉพาะรายการที่ใช้จริง หรือกด &ldquo;+ เพิ่มสินค้า&rdquo; ได้ตลอด (รายการที่ไม่ติ๊กจะถูกลบออกเมื่อบันทึก)
            </span>
          </p>
          {Boolean(requisition.approverSignatureUrl) && (
            <p className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5 pl-5">
              <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
              <span>
                หัวหน้าลงนามยืนยันแล้ว — สามารถติ๊กเช็คของและเพิ่มสินค้าเพิ่มเติมได้โดยยังคงลายเซ็นอนุมัติเดิมไว้
              </span>
            </p>
          )}
        </div>
      )}

      {/* Mobile Cards View */}
      <div
        className={
          variant === 'modal'
            ? 'md:hidden divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden'
            : 'md:hidden divide-y divide-slate-100'
        }
      >
        {rows.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            ไม่มีรายการสิ่งของ
          </div>
        ) : (
          rows.map((row, index) => {
            const { item, checked: isChecked, isNew } = row;
            const origQty = Number(item.quantity) || 1;
            const hasRet = !isNew && item.returnedQuantity !== undefined;
            const retQty = Number(item.returnedQuantity) || 0;

            return (
              <div
                key={row.key}
                onClick={() => {
                  if (!canEditItems || isNew) return;
                  toggleRowCheck(row.key);
                }}
                className={`p-3.5 sm:p-4 space-y-2.5 transition-colors ${
                  canEditItems && !isNew ? 'cursor-pointer active:bg-slate-50 ' : ''
                }${
                  isNew
                    ? isChecked
                      ? 'bg-blue-50/35'
                      : 'bg-rose-50/40 opacity-80'
                    : !canEditItems || isChecked
                    ? 'bg-white'
                    : 'bg-rose-50/40 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {canEditItems && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => toggleRowCheck(row.key, e.target.checked)}
                        className="mt-1 w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                      />
                    )}
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>

                    {isNew ? (
                      <div
                        className="min-w-0 flex-1 space-y-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                            สินค้าเพิ่มใหม่
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewRow(row.key)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>ลบ</span>
                          </button>
                        </div>

                        <input
                          ref={(el) => {
                            detailInputRefs.current[row.key] = el;
                          }}
                          type="text"
                          value={item.detail}
                          onChange={(e) =>
                            handleUpdateNewRowField(row.key, 'detail', e.target.value)
                          }
                          placeholder="ระบุชื่อสินค้า / รายการวัสดุอุปกรณ์ *"
                          className="w-full h-9 px-3 bg-white border border-blue-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />

                        {showSerialCol && (
                          <input
                            type="text"
                            value={item.assetCode || ''}
                            onChange={(e) =>
                              handleUpdateNewRowField(row.key, 'assetCode', e.target.value)
                            }
                            placeholder="รหัสสินค้า / Serial No. (ถ้ามี)"
                            className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                              จำนวน *
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateNewRowField(
                                  row.key,
                                  'quantity',
                                  Math.max(1, parseInt(e.target.value, 10) || 1)
                                )
                              }
                              className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-900 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                              หน่วย *
                            </label>
                            <input
                              type="text"
                              list={datalistId}
                              value={item.unit}
                              onChange={(e) =>
                                handleUpdateNewRowField(row.key, 'unit', e.target.value)
                              }
                              placeholder="ชิ้น, กล่อง..."
                              className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {isBorrow ? (
                            <input
                              type="text"
                              value={item.condition || 'ปกติ'}
                              onChange={(e) =>
                                handleUpdateNewRowField(row.key, 'condition', e.target.value)
                              }
                              placeholder="สภาพก่อนยืม"
                              className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          ) : (
                            <input
                              type="text"
                              value={item.job || ''}
                              onChange={(e) =>
                                handleUpdateNewRowField(row.key, 'job', e.target.value)
                              }
                              placeholder="งานที่ใช้ / Sub-Job"
                              className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          )}
                          <input
                            type="text"
                            value={item.remark || ''}
                            onChange={(e) =>
                              handleUpdateNewRowField(row.key, 'remark', e.target.value)
                            }
                            placeholder="หมายเหตุ"
                            className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-bold leading-snug break-words ${
                              !canEditItems || isChecked
                                ? 'text-slate-900'
                                : 'text-slate-400 line-through'
                            }`}
                          >
                            {item.detail || '-'}
                          </p>
                          {showSerialCol && item.assetCode && (
                            <p className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                              <Hash size={11} />
                              <span>SN/รหัส: {item.assetCode}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-xl border text-xs font-black whitespace-nowrap ${
                              !canEditItems || isChecked
                                ? 'bg-red-50 text-[#ff2301] border-red-100'
                                : 'bg-white text-slate-400 border-slate-200 line-through'
                            }`}
                          >
                            {item.quantity} {item.unit || 'ชิ้น'}
                          </span>
                          {canEditItems && !isChecked && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                              ไม่ใช้ • ลบอัตโนมัติ
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {!isNew && (
                  <>
                    <div className="flex flex-wrap items-center gap-2 pl-8 text-xs">
                      {isBorrow ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          สภาพก่อนยืม: {item.condition || 'ปกติ'}
                        </span>
                      ) : item.job ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          งาน: {item.job}
                        </span>
                      ) : null}

                      {isNonReturnableRequisitionType(requisition.requisitionType) ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${getNonReturnableBadgeClass(
                            requisition.requisitionType
                          )}`}
                        >
                          {getNonReturnableLabel(requisition.requisitionType, true)}
                        </span>
                      ) : hasRet ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            retQty >= origQty
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : retQty > 0
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          {retQty >= origQty
                            ? `คืนครบ (${retQty}/${origQty})`
                            : retQty > 0
                            ? `คืนแล้ว ${retQty}/${origQty}`
                            : 'ยังไม่คืน'}
                        </span>
                      ) : requisition.status === 'COMPLETED' ? (
                        <span className="text-[11px] text-slate-400 font-medium">
                          ยังไม่บันทึกคืน
                        </span>
                      ) : null}
                    </div>

                    {(item.returnRemark || item.remark) && (
                      <div className="ml-8 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-start gap-1.5">
                        <MessageSquare size={12} className="text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          {item.returnRemark ? `หมายเหตุคืน: ${item.returnRemark}` : item.remark}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div
        className={
          variant === 'modal'
            ? 'hidden md:block border border-slate-200 rounded-2xl overflow-x-auto'
            : 'hidden md:block overflow-x-auto'
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-600">
              {canEditItems && <th className="px-3.5 py-2.5 w-14 text-center">ใช้จริง</th>}
              <th className="px-3 py-2.5 w-12 text-center">ลำดับ</th>
              <th className="px-3.5 py-2.5">
                {isClaim
                  ? 'รายการสินค้า / อะไหล่เคลม'
                  : isBorrow
                  ? 'ชื่อเครื่องมือ / อุปกรณ์'
                  : 'รายการวัสดุ / อุปกรณ์'}
              </th>
              {showSerialCol && <th className="px-3 py-2.5 w-32">รหัส / Serial No.</th>}
              <th className="px-3 py-2.5 text-right w-24">จำนวน</th>
              <th className="px-3 py-2.5 w-24">หน่วย</th>
              {isBorrow ? (
                <th className="px-3 py-2.5 w-32">สภาพก่อนยืม</th>
              ) : isClaim ? (
                <th className="px-3 py-2.5">งานเคลม / ลูกค้า</th>
              ) : (
                <th className="px-3 py-2.5">งานที่ใช้ / Sub-Job</th>
              )}
              <th className="px-3 py-2.5">สถานะการคืน</th>
              <th className="px-3 py-2.5">หมายเหตุ</th>
              {canEditItems && rows.some((r) => r.isNew) && (
                <th className="px-2 py-2.5 w-10 text-center"></th>
              )}
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-100 ${variant === 'modal' ? 'text-xs' : 'text-sm'}`}>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    (canEditItems ? 8 : 7) +
                    (showSerialCol ? 1 : 0) +
                    (canEditItems && rows.some((r) => r.isNew) ? 1 : 0)
                  }
                  className="py-8 text-center text-slate-400 text-xs"
                >
                  ไม่มีรายการสิ่งของ
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const { item, checked: isChecked, isNew } = row;
                const origQty = Number(item.quantity) || 1;
                const hasRet = !isNew && item.returnedQuantity !== undefined;
                const retQty = Number(item.returnedQuantity) || 0;
                const hasAnyNewRow = canEditItems && rows.some((r) => r.isNew);

                return (
                  <tr
                    key={row.key}
                    onClick={() => {
                      if (!canEditItems || isNew) return;
                      toggleRowCheck(row.key);
                    }}
                    className={`transition-colors ${
                      canEditItems && !isNew ? 'cursor-pointer ' : ''
                    }${
                      isNew
                        ? isChecked
                          ? 'bg-blue-50/40'
                          : 'bg-rose-50/40 opacity-75'
                        : !canEditItems || isChecked
                        ? 'hover:bg-slate-50/60'
                        : 'bg-rose-50/40 opacity-75'
                    }`}
                  >
                    {canEditItems && (
                      <td className="px-3.5 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleRowCheck(row.key, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-center text-slate-400 font-bold text-xs">
                      {index + 1}
                    </td>

                    {isNew ? (
                      <>
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1">
                            <input
                              ref={(el) => {
                                detailInputRefs.current[row.key] = el;
                              }}
                              type="text"
                              value={item.detail}
                              onChange={(e) =>
                                handleUpdateNewRowField(row.key, 'detail', e.target.value)
                              }
                              placeholder="ระบุชื่อสินค้า / รายการ *"
                              className="w-full h-8 px-2.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            <span className="inline-flex px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                              เพิ่มใหม่
                            </span>
                          </div>
                        </td>
                        {showSerialCol && (
                          <td className="px-2.5 py-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={item.assetCode || ''}
                              onChange={(e) =>
                                handleUpdateNewRowField(row.key, 'assetCode', e.target.value)
                              }
                              placeholder="Serial/รหัส"
                              className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          </td>
                        )}
                        <td className="px-2.5 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateNewRowField(
                                row.key,
                                'quantity',
                                Math.max(1, parseInt(e.target.value, 10) || 1)
                              )
                            }
                            className="w-20 ml-auto block h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-2.5 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            list={datalistId}
                            value={item.unit}
                            onChange={(e) =>
                              handleUpdateNewRowField(row.key, 'unit', e.target.value)
                            }
                            placeholder="หน่วย"
                            className="w-20 h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-2.5 py-2" onClick={(e) => e.stopPropagation()}>
                          {isBorrow ? (
                            <input
                              type="text"
                              value={item.condition || 'ปกติ'}
                              onChange={(e) =>
                                handleUpdateNewRowField(row.key, 'condition', e.target.value)
                              }
                              placeholder="สภาพก่อนยืม"
                              className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          ) : (
                            <input
                              type="text"
                              value={item.job || ''}
                              onChange={(e) =>
                                handleUpdateNewRowField(row.key, 'job', e.target.value)
                              }
                              placeholder="งานที่ใช้..."
                              className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-400 text-[11px]">รายการใหม่</td>
                        <td className="px-2.5 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={item.remark || ''}
                            onChange={(e) =>
                              handleUpdateNewRowField(row.key, 'remark', e.target.value)
                            }
                            placeholder="หมายเหตุ..."
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewRow(row.key)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="ลบรายการที่เพิ่มใหม่"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                          <span className={!canEditItems || isChecked ? '' : 'line-through text-slate-400'}>
                            {item.detail}
                          </span>
                          {canEditItems && !isChecked && (
                            <span className="ml-2 inline-flex px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                              ไม่ใช้ • ลบอัตโนมัติ
                            </span>
                          )}
                        </td>
                        {showSerialCol && (
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                            {item.assetCode || '-'}
                          </td>
                        )}
                        <td
                          className={`px-3 py-2.5 font-black text-right tabular-nums ${
                            !canEditItems || isChecked
                              ? 'text-slate-900'
                              : 'text-slate-400 line-through'
                          }`}
                        >
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 text-xs font-semibold">
                          {item.unit}
                        </td>
                        {isBorrow ? (
                          <td className="px-3 py-2.5 text-xs text-slate-700">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">
                              {item.condition || 'ปกติ'}
                            </span>
                          </td>
                        ) : (
                          <td className="px-3 py-2.5 text-slate-700 text-xs">
                            {item.job || '-'}
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          {isNonReturnableRequisitionType(requisition.requisitionType) ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getNonReturnableBadgeClass(
                                requisition.requisitionType
                              )}`}
                            >
                              {getNonReturnableLabel(requisition.requisitionType)}
                            </span>
                          ) : hasRet ? (
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                  retQty >= origQty
                                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                                    : retQty > 0
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                <RotateCcw className="w-3 h-3" />
                                {retQty >= origQty
                                  ? `คืนครบ (${retQty}/${origQty})`
                                  : retQty > 0
                                  ? `คืนแล้ว ${retQty}/${origQty}`
                                  : 'ยังไม่คืน'}
                              </span>
                              {item.returnCondition && (
                                <div className="text-[11px] text-slate-500">
                                  สภาพ:{' '}
                                  {item.returnCondition === 'NORMAL'
                                    ? 'ปกติ'
                                    : item.returnCondition === 'DAMAGED'
                                    ? 'ชำรุด'
                                    : item.returnCondition === 'LOST'
                                    ? 'สูญหาย'
                                    : item.returnCondition}
                                </div>
                              )}
                            </div>
                          ) : requisition.status === 'COMPLETED' ? (
                            <span className="text-xs text-slate-400">ยังไม่บันทึกคืน</span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 text-xs">
                          {item.returnRemark ? (
                            <span className="text-teal-700 font-semibold">คืน: {item.returnRemark}</span>
                          ) : (
                            item.remark || '-'
                          )}
                        </td>
                        {hasAnyNewRow && <td />}
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Interactive Save / Add / PDF Action Bar */}
      {canEditItems && !hideActionBar && (
        <div
          className={`${
            variant === 'modal'
              ? 'px-3.5 py-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5'
              : 'px-4 sm:px-6 py-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3'
          } ${
            draftState.hasChanges
              ? 'bg-indigo-50/70 border-indigo-200/80'
              : 'bg-slate-50/60 border-slate-100'
          }`}
        >
          <div className="text-xs text-slate-700">
            {draftState.hasChanges ? (
              <span>
                รายการที่ใช้จริง{' '}
                <strong className="text-emerald-700">{draftState.keptItems.length} รายการ</strong>
                {draftState.addedCount > 0 && (
                  <>
                    {' '}
                    • <strong className="text-blue-700">เพิ่มใหม่ {draftState.addedCount}</strong>
                  </>
                )}
                {draftState.removedCount > 0 && (
                  <>
                    {' '}
                    •{' '}
                    <strong className="text-rose-600">
                      ลบที่ไม่ได้ติ๊ก {draftState.removedCount}
                    </strong>
                  </>
                )}
              </span>
            ) : (
              <span className="text-slate-500">
                ติ๊กเลือกครบทั้ง {existingCount} รายการ (เอาเครื่องหมายถูกออกเพื่อลบ หรือกด &ldquo;+ เพิ่มสินค้า&rdquo;)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!requisition.storeStaffSignatureUrl &&
              effectiveSavedStoreSig &&
              onTogglePullStoreSignature && (
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-indigo-50/70 border border-indigo-200 text-indigo-800 text-xs font-bold cursor-pointer select-none transition-colors">
                  <input
                    type="checkbox"
                    checked={pullStoreSignature}
                    onChange={(e) => onTogglePullStoreSignature(e.target.checked)}
                    className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>ดึงลายเซ็นผู้จ่ายคลังเดิมมาใส่ใน PDF</span>
                </label>
              )}

            {draftState.hasChanges && (
              <button
                type="button"
                disabled={isSaving || draftState.keptItems.length === 0}
                onClick={() => commitItems(false)}
                className="min-h-[38px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>บันทึกรายการ</span>
              </button>
            )}

            {!hidePdfButton && (
              <button
                type="button"
                disabled={isSaving || draftState.keptItems.length === 0}
                onClick={() => commitItems(true)}
                className={`min-h-[38px] px-4 py-2 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 transition-all shrink-0 disabled:opacity-50 ${
                  draftState.hasChanges || pullStoreSignature
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>กำลังบันทึก &amp; สร้าง PDF...</span>
                  </>
                ) : (
                  <>
                    <Printer size={15} />
                    <span>
                      {draftState.hasChanges
                        ? `บันทึก (${draftState.keptItems.length}) & แสดง PDF`
                        : `แสดงหน้า PDF (${draftState.keptItems.length} รายการ)`}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
