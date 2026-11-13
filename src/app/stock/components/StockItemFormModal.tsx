'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  PackagePlus,
  Edit3,
  SlidersHorizontal,
  Loader2,
  Upload,
  AlertCircle,
  ArrowUpCircle,
  Trash2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  createStockItem,
  updateStockItem,
  adjustStockItem,
} from '@/app/actions/stock';
import {
  type SerializedStockItem,
  COMMON_STOCK_UNITS,
  getStockStatusLabel,
} from '@/app/lib/stockUtils';

interface StockItemFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'adjust';
  onClose: () => void;
  onSuccess: () => void;
  onSwitchToRestock?: (itemId: string) => void;
  categoryId: string;
  categoryName: string;
  existingItems: SerializedStockItem[];
  editingItem?: SerializedStockItem | null;
}

export default function StockItemFormModal({
  isOpen,
  mode,
  onClose,
  onSuccess,
  onSwitchToRestock,
  categoryId,
  categoryName,
  existingItems,
  editingItem = null,
}: StockItemFormModalProps) {
  const [name, setName] = useState(editingItem?.name || '');
  const [sku, setSku] = useState(editingItem?.sku || '');
  const [unit, setUnit] = useState(editingItem?.unit || 'ชิ้น');
  const [initialStock, setInitialStock] = useState(
    mode === 'adjust' ? String(editingItem?.currentStock ?? 0) : '0'
  );
  const [minStock, setMinStock] = useState(
    editingItem?.minStock !== null && editingItem?.minStock !== undefined
      ? String(editingItem.minStock)
      : ''
  );
  const [unitPrice, setUnitPrice] = useState(
    editingItem?.unitPrice !== null && editingItem?.unitPrice !== undefined
      ? String(editingItem.unitPrice)
      : ''
  );
  const [prInfo, setPrInfo] = useState(editingItem?.prInfo || '');
  const [note, setNote] = useState(editingItem?.note || '');
  const [imageUrl, setImageUrl] = useState(editingItem?.imageUrl || '');
  const [isActive, setIsActive] = useState(editingItem?.isActive ?? true);
  const [adjustReason, setAdjustReason] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Live stock lookup while typing a product name in create mode ("โชว์สต็อกของเมื่อมาคีย์ในระบบ")
  const similarItems = useMemo(() => {
    if (mode !== 'create') return [];
    const q = name.trim().toLowerCase();
    if (q.length < 2) return [];
    return existingItems.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q)
    );
  }, [mode, name, existingItems]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'uploadsService');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success && json.url) {
        setImageUrl(json.url);
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'อัปโหลดรูปไม่สำเร็จ',
          text: json.error || 'เกิดข้อผิดพลาด',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      await Swal.fire({
        icon: 'error',
        title: 'อัปโหลดรูปไม่สำเร็จ',
        text: msg || 'เกิดข้อผิดพลาด',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'adjust' && editingItem) {
        const newQty = Math.floor(Number(initialStock));
        const res = await adjustStockItem({
          itemId: editingItem.id,
          newStockQty: newQty,
          reason: adjustReason,
        });
        if (!res.success) {
          await Swal.fire({ icon: 'error', title: 'ปรับยอดไม่สำเร็จ', text: res.error });
          return;
        }
        await Swal.fire({
          icon: 'success',
          title: 'ปรับยอดสต็อกเรียบร้อย',
          timer: 1600,
          showConfirmButton: false,
        });
      } else if (mode === 'edit' && editingItem) {
        const res = await updateStockItem(editingItem.id, {
          name,
          sku: sku.trim() || null,
          unit,
          minStock: minStock.trim() ? Number(minStock) : null,
          unitPrice: unitPrice.trim() ? Number(unitPrice) : null,
          prInfo: prInfo.trim() || null,
          note: note.trim() || null,
          imageUrl: imageUrl.trim() || null,
          isActive,
        });
        if (!res.success) {
          await Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: res.error });
          return;
        }
        await Swal.fire({
          icon: 'success',
          title: 'แก้ไขข้อมูลสินค้าเรียบร้อย',
          timer: 1600,
          showConfirmButton: false,
        });
      } else {
        const res = await createStockItem({
          categoryId,
          sku: sku.trim() || null,
          name,
          unit,
          initialStock: initialStock.trim() ? Number(initialStock) : 0,
          minStock: minStock.trim() ? Number(minStock) : null,
          unitPrice: unitPrice.trim() ? Number(unitPrice) : null,
          prInfo: prInfo.trim() || null,
          note: note.trim() || null,
          imageUrl: imageUrl.trim() || null,
          isActive,
        });
        if (!res.success) {
          await Swal.fire({ icon: 'error', title: 'เพิ่มสินค้าไม่สำเร็จ', text: res.error });
          return;
        }
        await Swal.fire({
          icon: 'success',
          title: 'เพิ่มสินค้าใหม่เข้าสต็อกเรียบร้อย',
          timer: 1600,
          showConfirmButton: false,
        });
      }

      onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === 'adjust'
      ? `ปรับยอดสต็อก: ${editingItem?.name || ''}`
      : mode === 'edit'
      ? `แก้ไขข้อมูลสินค้า: ${editingItem?.name || ''}`
      : `เพิ่มสินค้าใหม่ (${categoryName})`;

  const HeaderIcon =
    mode === 'adjust' ? SlidersHorizontal : mode === 'edit' ? Edit3 : PackagePlus;

  const targetQtyNum = Math.floor(Number(initialStock || 0));
  const adjustDelta =
    mode === 'adjust' && editingItem ? targetQtyNum - editingItem.currentStock : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[94dvh] flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <HeaderIcon size={19} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">{title}</h2>
              <p className="text-xs text-slate-500 truncate">
                {mode === 'adjust'
                  ? 'ใช้สำหรับตรวจนับสต็อกจริงและบันทึกเหตุผลการปรับปรุง'
                  : 'เมื่อพิมพ์ชื่อสินค้า ระบบจะตรวจสอบและแสดงสต็อกเดิมให้อัตโนมัติ'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {mode === 'adjust' && editingItem ? (
            <>
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">สต็อกในระบบปัจจุบัน</div>
                  <div className="text-2xl font-black text-slate-900">
                    {editingItem.currentStock.toLocaleString()}{' '}
                    <span className="text-sm font-semibold text-slate-500">
                      {editingItem.unit}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">ส่วนต่าง (ผลต่าง)</div>
                  <div
                    className={`text-lg font-black ${
                      adjustDelta > 0
                        ? 'text-slate-900'
                        : adjustDelta < 0
                        ? 'text-red-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {adjustDelta > 0 ? `+${adjustDelta.toLocaleString()}` : adjustDelta.toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ยอดสต็อกจริงที่ตรวจนับได้ ({editingItem.unit}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm font-bold outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เหตุผลในการปรับยอด <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="เช่น ตรวจนับสต็อกประจำเดือน / ชำรุดเสียหาย"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อสินค้า / ของพรีเมี่ยม <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น ร่มพับ TERA สีแดง / ปากกา / เสื้อ"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
                />

                {/* Live stock match panel while keying */}
                {similarItems.length > 0 && (
                  <div className="mt-2.5 p-3 rounded-xl border border-red-200 bg-red-50/60 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                      <AlertCircle size={14} className="text-red-600 shrink-0" />
                      <span>
                        พบสินค้าชื่อใกล้เคียงที่มีสต็อกในระบบแล้ว ({similarItems.length} รายการ)
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {similarItems.map((match) => {
                        const statusMeta = getStockStatusLabel(match.statusKind);
                        return (
                          <div
                            key={match.id}
                            className="p-2 rounded-lg bg-white border border-red-200/80 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">{match.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {match.sku || '-'} •{' '}
                                <span className={`font-bold ${match.currentStock <= 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                  คงเหลือ {match.currentStock.toLocaleString()} {match.unit}
                                </span>{' '}
                                ({statusMeta.label})
                              </div>
                            </div>
                            {onSwitchToRestock && (
                              <button
                                type="button"
                                onClick={() => onSwitchToRestock(match.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold inline-flex items-center gap-1 shrink-0"
                              >
                                <ArrowUpCircle size={13} />
                                <span>เติมสต็อกตัวนี้</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    รหัสสินค้า (SKU)
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="เช่น MKT-PRM-018 (ไม่บังคับ)"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    หน่วยนับ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="stock-unit-suggestions"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="เช่น ชิ้น / ใบ / ตัว / ด้าม"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
                  />
                  <datalist id="stock-unit-suggestions">
                    {COMMON_STOCK_UNITS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>

                {mode === 'create' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      จำนวนสต็อกตั้งต้น ({unit || 'ชิ้น'})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ขั้นต่ำแจ้งเตือนสต็อก (Min Stock)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    placeholder="เช่น 50"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ราคาอ้างอิงต่อหน่วย (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="เช่น 69"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div className={mode === 'edit' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    จำนวน PR ขั้นต่ำ / เงื่อนไขสั่งซื้อ
                  </label>
                  <input
                    type="text"
                    value={prInfo}
                    onChange={(e) => setPrInfo(e.target.value)}
                    placeholder="เช่น ขั้นต่ำ 100 / ไม่มีขั้นต่ำ"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  หมายเหตุสินค้า
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น แพคละ 200 / รอจัดหาใหม่ / งดผลิต"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <label className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
                    {uploadingImage ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    <span>{uploadingImage ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปสินค้า'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                  {imageUrl && (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={name || 'preview'}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="ลบรูป"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-slate-900 rounded"
                  />
                  <span className="text-xs font-bold text-slate-700">เปิดใช้งานให้เบิกได้</span>
                </label>
              </div>
            </>
          )}
        </form>

        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-sm font-bold"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || uploadingImage}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-2 shadow-sm"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            <span>{submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
