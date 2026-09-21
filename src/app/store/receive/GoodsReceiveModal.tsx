'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  PackageCheck,
  Truck,
  Layers,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Building2,
  FileText,
  RotateCcw,
  History,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import Swal from 'sweetalert2';

export interface GoodsReceiptRecord {
  id: string;
  sequenceNo?: number | null;
  recordedAt?: string | null;
  company?: string | null;
  poNumber: string;
  item?: string | null;
  quantity?: number | null;
  totalAmount?: number | null;
  creditTerm?: string | null;
  status?: string | null;
  targetDeliveryDate?: string | null;
  deliveredQuantity?: number | null;
  receivedAt?: string | null;
  deliveryNoteNumber?: string | null;
  recipient?: string | null;
  isCompleteDelivery: boolean;
  isIncompleteDelivery: boolean;
  createdAt?: string | null;
}

export interface POItem {
  id: number;
  no?: number | null;
  recordedAt?: string | Date | null;
  prNumber?: string | null;
  poNumber: string;
  vendorName?: string | null;
  accountNumber?: string | null;
  totalAmount?: number | null;
  depositAmount?: number | null;
  remainingAmount?: number | null;
  payment1?: number | null;
  creditTerm?: string | null;
  jobName?: string | null;
  itemList?: string | null;
  deliveryDate?: string | Date | null;
  note?: string | null;
  reportedBy?: string | null;
  receiveStatus?: string | null;
  receivedBy?: string | null;
  receivedAt?: string | Date | null;
  createdAt?: string | Date | null;
  projectName?: string | null;
  prRequestedBy?: string | null;
  goodsReceipts?: GoodsReceiptRecord[];
}

export interface ReceiveItemLine {
  id: string;
  name: string;
  orderedQty: number;
  unit: string;
  previouslyReceivedQty: number;
  receivedQty: number;
}

/**
 * Intelligent helper to parse line items from PO's itemList or existing GoodsReceipt records
 */
export function parseInitialItems(po: POItem): ReceiveItemLine[] {
  // If the PO already has previous goodsReceipts with JSON items, aggregate cumulative received totals
  if (po.goodsReceipts && po.goodsReceipts.length > 0) {
    const allParsedGrItems: Array<Array<{ name: string; orderedQty?: number; receivedQty?: number; unit?: string }>> = [];
    for (const gr of po.goodsReceipts) {
      if (gr.item && gr.item.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(gr.item);
          if (Array.isArray(parsed)) {
            allParsedGrItems.push(parsed);
          }
        } catch {}
      }
    }

    if (allParsedGrItems.length > 0) {
      const itemMap = new Map<string, { orderedQty: number; unit: string; prevReceived: number }>();

      // Accumulate previous deliveries
      for (const batch of allParsedGrItems) {
        for (const it of batch) {
          const key = (it.name || '').trim();
          if (!key) continue;
          if (!itemMap.has(key)) {
            itemMap.set(key, {
              orderedQty: Number(it.orderedQty) || 1,
              unit: it.unit || 'ชิ้น',
              prevReceived: 0
            });
          }
          const curr = itemMap.get(key)!;
          curr.prevReceived += Number(it.receivedQty) || 0;
          if (it.orderedQty && Number(it.orderedQty) > curr.orderedQty) {
            curr.orderedQty = Number(it.orderedQty);
          }
        }
      }

      const lines: ReceiveItemLine[] = [];
      let idx = 1;
      itemMap.forEach((val, key) => {
        const remaining = Math.max(0, val.orderedQty - val.prevReceived);
        lines.push({
          id: `item-${idx++}`,
          name: key,
          orderedQty: val.orderedQty,
          unit: val.unit,
          previouslyReceivedQty: val.prevReceived,
          receivedQty: remaining
        });
      });

      if (lines.length > 0) return lines;
    }
  }

  // Fallback: Parse from po.itemList
  const rawList = (po.itemList || '').trim();
  if (!rawList) {
    return [
      {
        id: 'item-1',
        name: `สินค้าตามใบสั่งซื้อ ${po.poNumber}`,
        orderedQty: 1,
        unit: 'รายการ',
        previouslyReceivedQty: 0,
        receivedQty: 1
      }
    ];
  }

  const rawLines = rawList.includes('\n')
    ? rawList.split('\n')
    : rawList.split(/,(?![^()]*\))/);

  const parsedLines: ReceiveItemLine[] = [];
  let idx = 1;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim().replace(/^[-*•\d+.\s)]+/, '').trim();
    if (!trimmed) continue;

    let qty = 1;
    let unit = 'ชิ้น';

    const qtyMatch = trimmed.match(/(?:x|\*|จำนวน)?\s*(\d+(?:\.\d+)?)\s*(แผง|เครื่อง|ตัว|ชุด|ชิ้น|เมตร|ม้วน|กล่อง|ถุง|ขวด|คัน|อัน|เส้น|ท่อน|แผ่น|ก้อน|ถัง|ตัน|กก\.|ลิตร|คู่|หลอด|มิล|รายการ)?/i);

    if (qtyMatch && qtyMatch[1] && qtyMatch[2]) {
      qty = parseFloat(qtyMatch[1]);
      unit = qtyMatch[2];
    } else if (
      trimmed.toLowerCase().includes('ค่าแรง') ||
      trimmed.toLowerCase().includes('ค่าบริการ') ||
      trimmed.toLowerCase().includes('ค่าขนส่ง')
    ) {
      unit = 'งาน';
    }

    parsedLines.push({
      id: `item-${idx++}`,
      name: trimmed,
      orderedQty: qty,
      unit: unit,
      previouslyReceivedQty: 0,
      receivedQty: qty
    });
  }

  return parsedLines.length > 0
    ? parsedLines
    : [
        {
          id: 'item-1',
          name: rawList,
          orderedQty: 1,
          unit: 'รายการ',
          previouslyReceivedQty: 0,
          receivedQty: 1
        }
      ];
}

interface GoodsReceiveModalProps {
  po: POItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedPo: POItem, isComplete: boolean, newGR: GoodsReceiptRecord) => void;
  userName: string;
}

export default function GoodsReceiveModal({
  po,
  isOpen,
  onClose,
  onSuccess,
  userName
}: GoodsReceiveModalProps) {
  const [receiveDate, setReceiveDate] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState<string>('');
  const [deliveryMode, setDeliveryMode] = useState<'COMPLETE' | 'PARTIAL'>('COMPLETE');
  const [items, setItems] = useState<ReceiveItemLine[]>([]);
  const [note, setNote] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize form when opened or PO changes
  useEffect(() => {
    if (!isOpen || !po) return;

    const todayStr = new Date().toISOString().split('T')[0];
    setReceiveDate(todayStr);
    setReceiverName(userName || 'เจ้าหน้าที่สโตร์');
    setDeliveryNoteNumber('');
    setNote('');

    const parsed = parseInitialItems(po);
    setItems(parsed);

    // If PO was already partially received, default to partial mode so user easily continues staggered delivery
    if (po.receiveStatus === 'Partial') {
      setDeliveryMode('PARTIAL');
      setShowHistory(true);
    } else {
      setDeliveryMode('COMPLETE');
      setShowHistory(false);
    }
  }, [isOpen, po, userName]);

  // Derived totals
  const totals = useMemo(() => {
    let totalOrdered = 0;
    let totalPrevReceived = 0;
    let totalReceivedThisTime = 0;
    let totalRemaining = 0;

    items.forEach(it => {
      const o = Number(it.orderedQty) || 0;
      const p = Number(it.previouslyReceivedQty) || 0;
      const r = Number(it.receivedQty) || 0;
      const rem = Math.max(0, o - p - r);

      totalOrdered += o;
      totalPrevReceived += p;
      totalReceivedThisTime += r;
      totalRemaining += rem;
    });

    const isAllFullyFulfilled = items.length > 0 && totalRemaining === 0 && totalReceivedThisTime > 0;

    return {
      totalOrdered,
      totalPrevReceived,
      totalReceivedThisTime,
      totalRemaining,
      isAllFullyFulfilled
    };
  }, [items]);

  if (!isOpen || !po) return null;

  // Handler: Change line quantity
  const handleQuantityChange = (id: string, value: string) => {
    const num = parseFloat(value);
    const validNum = isNaN(num) || num < 0 ? 0 : num;

    setItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          return { ...it, receivedQty: validNum };
        }
        return it;
      })
    );
  };

  // Handler: Fill Max for one line
  const handleFillMax = (id: string) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          const maxRemaining = Math.max(0, it.orderedQty - it.previouslyReceivedQty);
          return { ...it, receivedQty: maxRemaining };
        }
        return it;
      })
    );
  };

  // Handler: Set 0 for one line
  const handleSetZero = (id: string) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          return { ...it, receivedQty: 0 };
        }
        return it;
      })
    );
  };

  // Handler: Fill all remaining
  const handleFillAllRemaining = () => {
    setItems(prev =>
      prev.map(it => ({
        ...it,
        receivedQty: Math.max(0, it.orderedQty - it.previouslyReceivedQty)
      }))
    );
    setDeliveryMode('COMPLETE');
  };

  // Handler: Reset all to 0
  const handleResetAllToZero = () => {
    setItems(prev =>
      prev.map(it => ({
        ...it,
        receivedQty: 0
      }))
    );
  };

  // Handler: Add custom item line
  const handleAddItem = () => {
    const newId = `item-${Date.now()}`;
    setItems(prev => [
      ...prev,
      {
        id: newId,
        name: '',
        orderedQty: 1,
        unit: 'ชิ้น',
        previouslyReceivedQty: 0,
        receivedQty: 1
      }
    ]);
  };

  // Handler: Remove item line
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      Swal.fire({
        toast: true,
        icon: 'info',
        title: 'ต้องมีรายการสินค้าอย่างน้อย 1 รายการ',
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // Handler: Mode switch
  const handleModeSelect = (mode: 'COMPLETE' | 'PARTIAL') => {
    setDeliveryMode(mode);
    if (mode === 'COMPLETE') {
      // Auto-fill all remaining quantities
      setItems(prev =>
        prev.map(it => ({
          ...it,
          receivedQty: Math.max(0, it.orderedQty - it.previouslyReceivedQty)
        }))
      );
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiverName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุชื่อผู้ตรวจรับ',
        text: 'โปรดกรอกชื่อผู้ตรวจรับสินค้าเพื่อบันทึกประวัติการรับเข้าสโตร์'
      });
      return;
    }

    const hasReceivedQuantity = items.some(it => (Number(it.receivedQty) || 0) > 0);
    if (!hasReceivedQuantity) {
      Swal.fire({
        icon: 'warning',
        title: 'ยังไม่ได้ระบุจำนวนรับ',
        text: 'กรุณาระบุจำนวนสินค้าที่ได้รับในครั้งนี้อย่างน้อย 1 รายการ'
      });
      return;
    }

    // Determine complete vs partial:
    // If user explicitly chose COMPLETE, or if all items have remaining = 0
    const isComplete = deliveryMode === 'COMPLETE' || totals.isAllFullyFulfilled;

    // Confirm if marking complete when items remain
    if (deliveryMode === 'COMPLETE' && totals.totalRemaining > 0) {
      const confirmEarlyComplete = await Swal.fire({
        title: 'ยืนยันปิดรับสินค้าครบถ้วน?',
        text: `มีสินค้าบางรายการยังได้รับไม่ครบตามจำนวนสั่งซื้อ (คงเหลือ ${totals.totalRemaining} หน่วย) หากยืนยัน ระบบจะถือว่ารับครบสิ้นสุด PO นี้`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'ยืนยันปิดรับครบถ้วน',
        cancelButtonText: 'กลับไปแก้ไข'
      });

      if (!confirmEarlyComplete.isConfirmed) return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        receivedBy: receiverName.trim(),
        receivedAt: receiveDate || new Date().toISOString(),
        deliveryNoteNumber: deliveryNoteNumber.trim() || undefined,
        isCompleteDelivery: isComplete,
        note: note.trim() || undefined,
        items: items.map(it => ({
          name: it.name.trim() || 'สินค้าไม่ระบุชื่อ',
          orderedQty: Number(it.orderedQty) || 0,
          receivedQty: Number(it.receivedQty) || 0,
          remainingQty: Math.max(
            0,
            (Number(it.orderedQty) || 0) -
              (Number(it.previouslyReceivedQty) || 0) -
              (Number(it.receivedQty) || 0)
          ),
          unit: it.unit || 'ชิ้น'
        }))
      };

      const res = await fetch(`/api/store/receive/${encodeURIComponent(po.poNumber)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'บันทึกการตรวจรับไม่สำเร็จ');
      }

      const resData = await res.json();
      const updatedPo = resData.data as POItem;
      const newGR = resData.goodsReceipt as GoodsReceiptRecord;

      onSuccess(updatedPo, isComplete, newGR);
      onClose();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextShipmentSeq = (po.goodsReceipts?.length || 0) + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 my-auto">
        {/* 1. Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {po.poNumber}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                งวดที่ {nextShipmentSeq}
              </span>
              {po.receiveStatus === 'Partial' && (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> รับแล้วบางส่วน
                </span>
              )}
            </div>
            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>ผู้ขาย: <strong className="text-slate-800">{po.vendorName || '-'}</strong></span>
              <span>โครงการ: <strong className="text-slate-800">{po.projectName || '-'}</strong></span>
              {po.prNumber && <span>PR: <strong className="text-slate-700">{po.prNumber}</strong></span>}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-700">
          {/* Section A: Delivery Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            {/* Date Received */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>วันที่รับสินค้าเข้าสโตร์ *</span>
              </label>
              <input
                type="date"
                required
                value={receiveDate}
                onChange={e => setReceiveDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* DO / Delivery Note Number */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>เลขที่ใบส่งสินค้า / DO / Invoice</span>
              </label>
              <input
                type="text"
                placeholder="เช่น DO-69012 หรือ INV-1002"
                value={deliveryNoteNumber}
                onChange={e => setDeliveryNoteNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Receiver Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>ชื่อผู้ตรวจรับเข้าสโตร์ *</span>
              </label>
              <input
                type="text"
                required
                placeholder="ระบุชื่อ-นามสกุลผู้รับ"
                value={receiverName}
                onChange={e => setReceiverName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Section B: Delivery Mode Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-slate-600" />
                <span>รูปแบบการส่งมอบสินค้า (Delivery Mode)</span>
              </span>
              <span className="text-[11px] text-slate-500">
                เลือกรูปแบบเพื่อกำหนดสถานะของใบสั่งซื้อ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Full Delivery */}
              <div
                onClick={() => handleModeSelect('COMPLETE')}
                className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                  deliveryMode === 'COMPLETE'
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-100'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      deliveryMode === 'COMPLETE'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300'
                    }`}
                  >
                    {deliveryMode === 'COMPLETE' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>รับสินค้าครบถ้วนทั้งหมด (Full Delivery)</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                        ปิดงาน PO
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      ผู้ขายส่งมอบสินค้าครบตามที่สั่งซื้อทุกรายการ PO จะเปลี่ยนเป็น &quot;รับสินค้าแล้ว&quot; และส่งต่อให้ฝ่ายบัญชีจ่ายเงิน
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Partial Delivery */}
              <div
                onClick={() => handleModeSelect('PARTIAL')}
                className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                  deliveryMode === 'PARTIAL'
                    ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-100'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      deliveryMode === 'PARTIAL'
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-slate-300'
                    }`}
                  >
                    {deliveryMode === 'PARTIAL' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>รับบางส่วน / ทยอยส่ง (Partial / Staggered Delivery)</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                        มีค้างส่ง
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      ส่งของบางส่วน หรือแบ่งส่งหลายเที่ยว PO จะคงอยู่ในหน้ารอตรวจรับ เพื่อรอรับสินค้าในงวดถัดไป
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Item Quantities Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-600" />
                <span>รายการสินค้าและระบุจำนวนที่รับในงวดนี้ (Line Items & Quantities)</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFillAllRemaining}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>รับครบที่เหลือทั้งหมด</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAllToZero}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>รีเซ็ตเป็น 0</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>เพิ่มรายการ</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3">รายการสินค้า (Item Description)</th>
                    <th className="py-2.5 px-3 text-center w-28">สั่งซื้อ (Ordered)</th>
                    <th className="py-2.5 px-3 text-center w-24">หน่วย</th>
                    <th className="py-2.5 px-3 text-center w-24">รับแล้วก่อนหน้า</th>
                    <th className="py-2.5 px-3 text-center w-40 bg-blue-50/60 text-blue-900">
                      จำนวนรับงวดนี้ *
                    </th>
                    <th className="py-2.5 px-3 text-center w-28">คงเหลือค้างส่ง</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {items.map((it, idx) => {
                    const ordered = Number(it.orderedQty) || 0;
                    const prev = Number(it.previouslyReceivedQty) || 0;
                    const received = Number(it.receivedQty) || 0;
                    const remaining = Math.max(0, ordered - prev - received);
                    const isFullyReceived = remaining === 0;

                    return (
                      <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Row Number */}
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>

                        {/* Item Name */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={it.name}
                            onChange={e => {
                              const v = e.target.value;
                              setItems(prev => prev.map(p => (p.id === it.id ? { ...p, name: v } : p)));
                            }}
                            placeholder="ระบุชื่อสินค้า..."
                            className="w-full px-2.5 py-1.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </td>

                        {/* Ordered Quantity */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={it.orderedQty}
                            onChange={e => {
                              const num = parseFloat(e.target.value) || 0;
                              setItems(prev => prev.map(p => (p.id === it.id ? { ...p, orderedQty: num } : p)));
                            }}
                            className="w-20 px-2 py-1 text-center bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                          />
                        </td>

                        {/* Unit */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="text"
                            value={it.unit}
                            onChange={e => {
                              const v = e.target.value;
                              setItems(prev => prev.map(p => (p.id === it.id ? { ...p, unit: v } : p)));
                            }}
                            className="w-16 px-1.5 py-1 text-center bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-600"
                          />
                        </td>

                        {/* Previously Received */}
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-xs font-mono font-medium ${
                              prev > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-400'
                            }`}
                          >
                            {prev}
                          </span>
                        </td>

                        {/* Received This Time (Editable) */}
                        <td className="py-2.5 px-3 text-center bg-blue-50/20">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.receivedQty}
                              onChange={e => handleQuantityChange(it.id, e.target.value)}
                              className="w-20 px-2.5 py-1 text-center bg-white border-2 border-blue-400 rounded-lg text-xs font-black text-blue-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleFillMax(it.id)}
                              title="รับเต็มจำนวนคงเหลือ"
                              className="px-1.5 py-1 text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors"
                            >
                              Max
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetZero(it.id)}
                              title="ยังไม่ได้รับในงวดนี้"
                              className="px-1.5 py-1 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                            >
                              0
                            </button>
                          </div>
                        </td>

                        {/* Remaining Quantity */}
                        <td className="py-2.5 px-3 text-center">
                          {isFullyReceived ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              <span>ครบแล้ว</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <span>ค้าง {remaining}</span>
                            </span>
                          )}
                        </td>

                        {/* Delete Button */}
                        <td className="py-2.5 px-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.id)}
                              className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                              title="ลบรายการนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section D: Notes */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-700 text-xs flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>หมายเหตุการตรวจรับสินค้า (Shipment Notes & Condition)</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="เช่น สภาพสินค้าเรียบร้อย กล่องบรรจุภัณฑ์สมบูรณ์, นัดส่งมอบส่วนที่เหลือสัปดาห์หน้า..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Section E: Previous Shipments Timeline (if available) */}
          {po.goodsReceipts && po.goodsReceipts.length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full p-3.5 flex items-center justify-between text-left font-semibold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>ประวัติการส่งมอบก่อนหน้านี้ ({po.goodsReceipts.length} งวดที่ผ่านมา)</span>
                </div>
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showHistory && (
                <div className="p-4 pt-0 space-y-3 border-t border-slate-200/60 divide-y divide-slate-200/60">
                  {po.goodsReceipts.map((gr, i) => (
                    <div key={gr.id || i} className="pt-3 first:pt-1 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            งวดที่ {gr.sequenceNo || i + 1}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              gr.isCompleteDelivery
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {gr.isCompleteDelivery ? 'ส่งมอบครบถ้วน' : 'ส่งมอบบางส่วน'}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          วันที่: <strong>{gr.receivedAt ? new Date(gr.receivedAt).toLocaleDateString('th-TH') : '-'}</strong> | ผู้รับ: <strong>{gr.recipient || '-'}</strong>
                        </div>
                      </div>

                      {gr.deliveryNoteNumber && (
                        <div className="text-slate-500 text-[11px]">
                          ใบส่งของ / DO: <span className="font-mono text-slate-700">{gr.deliveryNoteNumber}</span>
                        </div>
                      )}

                      {gr.item && (
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 text-[11px] font-mono whitespace-pre-wrap">
                          {(() => {
                            try {
                              const parsed = JSON.parse(gr.item);
                              if (Array.isArray(parsed)) {
                                return (
                                  <div className="space-y-1">
                                    {parsed.map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between">
                                        <span>• {item.name}</span>
                                        <span className="font-semibold text-blue-700">
                                          รับ {item.receivedQty} {item.unit || 'ชิ้น'} (สั่ง {item.orderedQty})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                            } catch {}
                            return gr.item;
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        {/* 3. Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Summary Indicator */}
          <div className="text-xs space-y-0.5 text-center sm:text-left">
            <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-start">
              <span>ยอดตรวจรับงวดนี้:</span>
              <strong className="text-blue-700 font-bold text-sm">
                {totals.totalReceivedThisTime.toLocaleString()}
              </strong>
              <span>หน่วย ({items.length} รายการ)</span>
              {totals.totalRemaining > 0 && (
                <span className="text-amber-700 font-medium">
                  • ค้างส่งอีก {totals.totalRemaining.toLocaleString()} หน่วย
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              {deliveryMode === 'COMPLETE' || totals.isAllFullyFulfilled ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1 justify-center sm:justify-start">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  สถานะหลังบันทึก: ตรวจรับครบถ้วนสมบูรณ์ (Received)
                </span>
              ) : (
                <span className="text-amber-700 font-semibold flex items-center gap-1 justify-center sm:justify-start">
                  <Clock className="w-3.5 h-3.5" />
                  สถานะหลังบันทึก: รับบางส่วน (Partial) — ยังคงรอรับงวดถัดไป
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              <PackageCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกตรวจรับเข้าสโตร์'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
