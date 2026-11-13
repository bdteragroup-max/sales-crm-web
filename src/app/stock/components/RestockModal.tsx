'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ArrowUpCircle,
  Loader2,
  Calendar,
  FileText,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { restockStockItems } from '@/app/actions/stock';
import { type SerializedStockItem } from '@/app/lib/stockUtils';
import StockItemPicker from './StockItemPicker';

interface RestockLine {
  key: string;
  itemId: string;
  quantity: number;
  unitPrice: string;
}

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  items: SerializedStockItem[];
  initialItemId?: string | null;
}

export default function RestockModal({
  isOpen,
  onClose,
  onSuccess,
  items,
  initialItemId = null,
}: RestockModalProps) {
  const initialItem = initialItemId ? items.find((i) => i.id === initialItemId) : undefined;

  const [txType, setTxType] = useState<'RESTOCK' | 'RETURN'>('RESTOCK');
  const [lines, setLines] = useState<RestockLine[]>(() => [
    {
      key: 'restock-1',
      itemId: initialItemId || '',
      quantity: 10,
      unitPrice: initialItem?.unitPrice !== null && initialItem?.unitPrice !== undefined ? String(initialItem.unitPrice) : '',
    },
  ]);
  const [supplierOrSource, setSupplierOrSource] = useState('ฝ่ายการตลาด');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const totalUnits = useMemo(
    () => lines.reduce((sum, l) => sum + (l.itemId ? Math.max(0, Number(l.quantity) || 0) : 0), 0),
    [lines]
  );

  const hasValidationError = useMemo(() => {
    const valid = lines.filter((l) => l.itemId);
    if (valid.length === 0) return true;
    return valid.some((l) => !Number.isInteger(l.quantity) || l.quantity <= 0);
  }, [lines]);

  if (!isOpen) return null;

  const selectedIds = lines.map((l) => l.itemId).filter(Boolean);

  const handleSelectLineItem = (key: string, id: string) => {
    const found = itemMap.get(id);
    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              itemId: id,
              unitPrice:
                found?.unitPrice !== null && found?.unitPrice !== undefined
                  ? String(found.unitPrice)
                  : '',
            }
          : l
      )
    );
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { key: `restock-${Date.now()}-${prev.length + 1}`, itemId: '', quantity: 10, unitPrice: '' },
    ]);
  };

  const handleRemoveLine = (key: string) => {
    if (lines.length === 1) {
      setLines([{ key: 'restock-1', itemId: '', quantity: 10, unitPrice: '' }]);
      return;
    }
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.itemId);
    if (validLines.length === 0) return;

    setSubmitting(true);
    try {
      const res = await restockStockItems({
        txType,
        supplierOrSource: supplierOrSource.trim() || 'ฝ่ายการตลาด',
        txDate,
        note: note.trim() || undefined,
        items: validLines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice.trim() ? Number(l.unitPrice) : undefined,
        })),
      });

      if (!res.success) {
        await Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถเติมสต็อกได้',
          text: res.error,
          confirmButtonColor: '#dc2626',
        });
        return;
      }

      await Swal.fire({
        icon: 'success',
        title: txType === 'RETURN' ? 'รับคืนเข้าสต็อกเรียบร้อย' : 'เติมสต็อกสินค้าเรียบร้อย',
        html: `<div class="text-sm text-slate-600">เลขที่อ้างอิง: <strong class="font-mono text-slate-900">${res.batchCode}</strong></div>`,
        timer: 2000,
        showConfirmButton: false,
      });

      onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[94dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-100/80 to-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <ArrowUpCircle size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                เติมสต็อก / รับสินค้าเข้าคลังการตลาด
              </h2>
              <p className="text-xs text-slate-500 truncate">
                สำหรับฝ่ายการตลาดและผู้จัดการฝ่ายการตลาด อัปเดตยอดทันทีหลังบันทึก
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100">
            <button
              type="button"
              onClick={() => setTxType('RESTOCK')}
              className={`min-h-[40px] rounded-lg text-xs sm:text-sm font-bold transition-all ${
                txType === 'RESTOCK'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              สั่งซื้อ / เติมสต็อกใหม่
            </button>
            <button
              type="button"
              onClick={() => setTxType('RETURN')}
              className={`min-h-[40px] rounded-lg text-xs sm:text-sm font-bold transition-all ${
                txType === 'RETURN'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รับคืนของเข้าคลัง
            </button>
          </div>

          {/* Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-slate-800">
                รายการสินค้าที่เติมเข้า ({lines.length} แถว)
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} />
                <span>เพิ่มรายการ</span>
              </button>
            </div>

            {lines.map((line, idx) => {
              const selectedItem = line.itemId ? itemMap.get(line.itemId) : undefined;
              const qty = Math.max(0, Number(line.quantity) || 0);
              const afterStock = (selectedItem?.currentStock ?? 0) + qty;

              return (
                <div
                  key={line.key}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-500">รายการที่ #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(line.key)}
                      className="min-h-[32px] px-2 rounded-lg text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 inline-flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>ลบ</span>
                    </button>
                  </div>

                  <StockItemPicker
                    items={items}
                    selectedItemId={line.itemId}
                    onSelect={(id) => handleSelectLineItem(line.key, id)}
                    disableOutOfStock={false}
                    excludeItemIds={selectedIds}
                    accentColor="slate"
                  />

                  {selectedItem && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 items-center">
                      <div className="sm:col-span-6 flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold">
                          เดิม: <strong>{selectedItem.currentStock.toLocaleString()}</strong>
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-bold inline-flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>
                            หลังเติมเป็น {afterStock.toLocaleString()} {selectedItem.unit}
                          </span>
                        </span>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          ราคาต่อหน่วย (บาท)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key ? { ...l, unitPrice: e.target.value } : l
                              )
                            )
                          }
                          placeholder="ไม่บังคับ"
                          className="w-full min-h-[40px] px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
                        />
                      </div>

                      <div className="sm:col-span-3 flex flex-col items-end">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          จำนวนรับเข้า ({selectedItem.unit})
                        </label>
                        <div className="inline-flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setLines((prev) =>
                                prev.map((l) =>
                                  l.key === line.key
                                    ? { ...l, quantity: Math.max(1, l.quantity - 1) }
                                    : l
                                )
                              )
                            }
                            className="w-9 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 border-r border-slate-200"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value || '1', 10) || 1);
                              setLines((prev) =>
                                prev.map((l) =>
                                  l.key === line.key ? { ...l, quantity: val } : l
                                )
                              );
                            }}
                            className="w-14 h-10 text-center text-base sm:text-sm font-black text-slate-900 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setLines((prev) =>
                                prev.map((l) =>
                                  l.key === line.key ? { ...l, quantity: l.quantity + 1 } : l
                                )
                              )
                            }
                            className="w-9 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 border-l border-slate-200"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Truck size={13} className="text-slate-400" />
                <span>แหล่งที่มา / ผู้รับผิดชอบ / เลขที่ PR-PO</span>
              </label>
              <input
                type="text"
                value={supplierOrSource}
                onChange={(e) => setSupplierOrSource(e.target.value)}
                placeholder="เช่น ฝ่ายการตลาด / สั่งผลิตล็อตใหม่"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Calendar size={13} className="text-slate-400" />
                <span>วันที่รับเข้า / เติมสต็อก</span>
              </label>
              <input
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                required
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm appearance-none outline-none focus:border-slate-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <FileText size={13} className="text-slate-400" />
                <span>หมายเหตุเพิ่มเติม</span>
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ระบุหมายเหตุ เช่น ครบตามสั่งซื้อ / รับเข้าคลังสำนักงานใหญ่"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-600">
            รวมรับเข้า{' '}
            <strong className="text-slate-900 font-black">
              {lines.filter((l) => l.itemId).length} รายการ
            </strong>{' '}
            (+{totalUnits.toLocaleString()} หน่วย)
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-sm font-bold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || hasValidationError}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowUpCircle size={16} />
              )}
              <span>{submitting ? 'กำลังบันทึก...' : 'ยืนยันเติมสต็อก'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

