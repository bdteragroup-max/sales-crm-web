'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ArrowDownCircle,
  Loader2,
  AlertTriangle,
  User,
  MapPin,
  Calendar,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { withdrawStockItems } from '@/app/actions/stock';
import {
  type SerializedStockItem,
  COMMON_BRANCH_OPTIONS,
  WITHDRAW_PURPOSE_PRESETS,
} from '@/app/lib/stockUtils';
import StockItemPicker from './StockItemPicker';

interface WithdrawLine {
  key: string;
  itemId: string;
  quantity: number;
}

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  items: SerializedStockItem[];
  initialItemId?: string | null;
  currentUser: {
    id: string;
    fullName: string;
    role: string;
    branch: string | null;
  };
  users: Array<{ id: string; fullName: string; role: string }>;
}

export default function WithdrawModal({
  isOpen,
  onClose,
  onSuccess,
  items,
  initialItemId = null,
  currentUser,
  users,
}: WithdrawModalProps) {
  const [lines, setLines] = useState<WithdrawLine[]>(() => [
    {
      key: 'line-1',
      itemId: initialItemId || '',
      quantity: 1,
    },
  ]);
  const [requesterName, setRequesterName] = useState(currentUser.fullName || '');
  const [branch, setBranch] = useState(currentUser.branch || '');
  const [purpose, setPurpose] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // Cumulative requested qty per itemId across lines
  const requestedByItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of lines) {
      if (!l.itemId) continue;
      map.set(l.itemId, (map.get(l.itemId) || 0) + (Number(l.quantity) || 0));
    }
    return map;
  }, [lines]);

  const totalUnits = useMemo(
    () => lines.reduce((sum, l) => sum + (l.itemId ? Math.max(0, Number(l.quantity) || 0) : 0), 0),
    [lines]
  );

  const hasValidationError = useMemo(() => {
    const selected = lines.filter((l) => l.itemId);
    if (selected.length === 0) return true;
    for (const l of selected) {
      if (!Number.isInteger(l.quantity) || l.quantity <= 0) return true;
      const item = itemMap.get(l.itemId);
      if (!item || !item.isActive) return true;
      const totalForItem = requestedByItemId.get(l.itemId) || 0;
      if (totalForItem > item.currentStock) return true;
    }
    return false;
  }, [lines, itemMap, requestedByItemId]);

  if (!isOpen) return null;

  const selectedIds = lines.map((l) => l.itemId).filter(Boolean);

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { key: `line-${Date.now()}-${prev.length + 1}`, itemId: '', quantity: 1 },
    ]);
  };

  const handleRemoveLine = (key: string) => {
    if (lines.length === 1) {
      setLines([{ key: 'line-1', itemId: '', quantity: 1 }]);
      return;
    }
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validLines = lines.filter((l) => l.itemId);
    if (validLines.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกสินค้าที่ต้องการเบิก',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    for (const l of validLines) {
      const item = itemMap.get(l.itemId);
      if (!item) continue;
      const totalReq = requestedByItemId.get(l.itemId) || 0;
      if (totalReq > item.currentStock) {
        await Swal.fire({
          icon: 'error',
          title: `สต็อก "${item.name}" ไม่เพียงพอ`,
          text: `คงเหลือปัจจุบัน ${item.currentStock.toLocaleString()} ${item.unit} แต่ต้องการเบิก ${totalReq.toLocaleString()} ${item.unit}`,
          confirmButtonColor: '#dc2626',
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await withdrawStockItems({
        requesterName: requesterName.trim() || currentUser.fullName,
        requesterUserId: currentUser.id,
        branch: branch.trim() || undefined,
        purpose: purpose.trim() || undefined,
        note: note.trim() || undefined,
        txDate,
        items: validLines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
      });

      if (!res.success) {
        await Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถบันทึกการเบิกได้',
          text: res.error,
          confirmButtonColor: '#dc2626',
        });
        return;
      }

      await Swal.fire({
        icon: 'success',
        title: 'เบิกสินค้าและตัดสต็อกเรียบร้อย',
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
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-red-50/80 to-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <ArrowDownCircle size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                เบิกสินค้า / ของพรีเมี่ยม
              </h2>
              <p className="text-xs text-slate-500 truncate">
                ระบบจะแสดงยอดสต็อกคงเหลือทันทีและตัดสต็อกอัตโนมัติเมื่อยืนยัน
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
          {/* Item Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-slate-800">
                รายการสินค้าที่ต้องการเบิก ({lines.length} แถว)
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} />
                <span>เพิ่มรายการ</span>
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => {
                const selectedItem = line.itemId ? itemMap.get(line.itemId) : undefined;
                const totalForItem = line.itemId ? requestedByItemId.get(line.itemId) || 0 : 0;
                const afterStock = selectedItem ? selectedItem.currentStock - totalForItem : 0;
                const isOverStock = Boolean(selectedItem && afterStock < 0);
                const isNearMin = Boolean(
                  selectedItem &&
                    afterStock >= 0 &&
                    selectedItem.minStock !== null &&
                    selectedItem.minStock > 0 &&
                    afterStock <= selectedItem.minStock
                );

                return (
                  <div
                    key={line.key}
                    className={`p-3.5 rounded-2xl border transition-colors space-y-3 ${
                      isOverStock
                        ? 'border-red-300 bg-red-50/40'
                        : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-500">
                        รายการที่ #{idx + 1}
                      </span>
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
                      onSelect={(id) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === line.key ? { ...l, itemId: id } : l))
                        )
                      }
                      disableOutOfStock={true}
                      excludeItemIds={selectedIds}
                      accentColor="red"
                    />

                    {selectedItem && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        {/* Real-time stock balance preview */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold">
                            คงเหลือ:{' '}
                            <strong className="text-slate-900">
                              {selectedItem.currentStock.toLocaleString()}
                            </strong>{' '}
                            {selectedItem.unit}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span
                            className={`px-2.5 py-1 rounded-lg border font-bold inline-flex items-center gap-1 ${
                              isOverStock
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : isNearMin
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            {isOverStock ? (
                              <>
                                <AlertTriangle size={13} />
                                <span>เกินสต็อก ({afterStock.toLocaleString()})</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={13} />
                                <span>
                                  หลังเบิกเหลือ {afterStock.toLocaleString()} {selectedItem.unit}
                                </span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Touch quantity stepper */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className="text-xs font-bold text-slate-500">จำนวนเบิก:</span>
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
                              className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 border-r border-slate-200"
                            >
                              <Minus size={15} />
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={selectedItem.currentStock}
                              value={line.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value || '1', 10) || 1);
                                setLines((prev) =>
                                  prev.map((l) =>
                                    l.key === line.key ? { ...l, quantity: val } : l
                                  )
                                );
                              }}
                              className="w-16 h-10 text-center text-base sm:text-sm font-black text-slate-900 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setLines((prev) =>
                                  prev.map((l) =>
                                    l.key === line.key
                                      ? { ...l, quantity: l.quantity + 1 }
                                      : l
                                  )
                                )
                              }
                              className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 border-l border-slate-200"
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Requester Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <User size={13} className="text-slate-400" />
                <span>ชื่อผู้เบิก / ผู้รับของ</span>
              </label>
              <input
                type="text"
                list="stock-user-suggestions"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="ระบุชื่อพนักงาน หรือสาขาที่นำไปใช้"
                required
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
              <datalist id="stock-user-suggestions">
                {users.map((u) => (
                  <option key={u.id} value={u.fullName} />
                ))}
                {COMMON_BRANCH_OPTIONS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <MapPin size={13} className="text-slate-400" />
                <span>สาขา / หน่วยงาน</span>
              </label>
              <input
                type="text"
                list="stock-branch-suggestions"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="เช่น BKK-HQ, สาขาพิษณุโลก, อบรม"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
              <datalist id="stock-branch-suggestions">
                {COMMON_BRANCH_OPTIONS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Calendar size={13} className="text-slate-400" />
                <span>วันที่เบิก</span>
              </label>
              <input
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                required
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm appearance-none outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <FileText size={13} className="text-slate-400" />
                <span>วัตถุประสงค์ในการเบิก</span>
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="เช่น แจกลูกค้าหน้างาน / งานอบรม"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {WITHDRAW_PURPOSE_PRESETS.slice(0, 3).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setPurpose(tag)}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-red-50 text-[11px] font-medium text-slate-600 hover:text-red-700 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                หมายเหตุเพิ่มเติม (ถ้ามี)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ระบุรายละเอียดเพิ่มเติม เช่น ชื่อลูกค้า โครงการ หรือสถานที่จัดส่ง"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-600">
            รวมเบิกทั้งหมด{' '}
            <strong className="text-slate-900 font-black">
              {lines.filter((l) => l.itemId).length} รายการ
            </strong>{' '}
            ({totalUnits.toLocaleString()} หน่วย)
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
              className="min-h-[44px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownCircle size={16} />}
              <span>{submitting ? 'กำลังบันทึก...' : 'ยืนยันการเบิกและตัดสต็อก'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

