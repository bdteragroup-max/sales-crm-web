"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, X, Upload, CheckCircle2, AlertTriangle, Image as ImageIcon, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { submitReturnRequest } from '@/app/actions/requisitions';

interface ReturnItemState {
  index: number;
  isSelected: boolean;
  detail: string;
  quantity: number;
  alreadyReturned: number;
  returningQuantity: number;
  unit: string;
  condition: string;
  remark: string;
}

interface Props {
  requisition: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReturnRequestModal({ requisition, isOpen, onClose, onSuccess }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // Initialize return items based on what hasn't been fully returned
  const items = Array.isArray(requisition?.items) ? requisition.items : [];
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>(() => {
    return items.map((it: any, idx: number) => {
      const origQty = Number(it.quantity) || 1;
      const alreadyRet = Number(it.returnedQuantity) || 0;
      const remaining = Math.max(0, origQty - alreadyRet);
      return {
        index: idx,
        isSelected: remaining > 0,
        detail: it.detail || `รายการที่ ${idx + 1}`,
        quantity: origQty,
        alreadyReturned: alreadyRet,
        returningQuantity: remaining > 0 ? remaining : origQty,
        unit: it.unit || 'ชิ้น',
        condition: 'NORMAL',
        remark: '',
      };
    });
  });

  if (!isOpen || !requisition) return null;

  const handleToggleSelect = (index: number) => {
    setReturnItems(prev =>
      prev.map(it => (it.index === index ? { ...it, isSelected: !it.isSelected } : it))
    );
  };

  const handleQtyChange = (index: number, val: number) => {
    setReturnItems(prev =>
      prev.map(it => (it.index === index ? { ...it, returningQuantity: Math.max(1, val) } : it))
    );
  };

  const handleConditionChange = (index: number, condition: string) => {
    setReturnItems(prev =>
      prev.map(it => (it.index === index ? { ...it, condition } : it))
    );
  };

  const handleRemarkChange = (index: number, remark: string) => {
    setReturnItems(prev =>
      prev.map(it => (it.index === index ? { ...it, remark } : it))
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 4) {
      Swal.fire({
        icon: 'warning',
        title: 'จำกัดรูปภาพ',
        text: 'สามารถแนบรูปภาพได้สูงสุด 4 รูป',
      });
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPhotos(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (photoIdx: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== photoIdx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedList = returnItems.filter(it => it.isSelected);
    if (selectedList.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกรายการที่ต้องการส่งคืน',
        text: 'ต้องมีรายการอุปกรณ์อย่างน้อย 1 รายการที่เลือกส่งคืน',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitReturnRequest(requisition.id, {
        returnedItems: selectedList.map(it => ({
          index: it.index,
          returnQuantity: it.returningQuantity,
          condition: it.condition,
          remark: it.remark,
        })),
        returnNote,
        photos,
      });

      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'แจ้งส่งคืนสโตร์เรียบร้อยแล้ว',
          text: `ระบบได้ส่งข้อความแจ้งเตือนเจ้าหน้าที่สโตร์สำหรับใบเบิก ${requisition.requisitionNumber} แล้ว กรุณานำอุปกรณ์ไปส่งมอบที่สโตร์`,
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#059669',
        });
        onClose();
        if (onSuccess) onSuccess();
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถส่งข้อมูลแจ้งคืนได้',
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
              <RotateCcw size={22} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                แจ้งขอส่งคืนอุปกรณ์เข้าสโตร์
                <span className="text-xs bg-emerald-950/40 text-emerald-200 px-2 py-0.5 rounded-full font-mono">
                  {requisition.requisitionNumber}
                </span>
              </h2>
              <p className="text-xs text-emerald-100">
                แจ้งสโตร์ล่วงหน้าก่อนนำอุปกรณ์มาส่งคืน เพื่อให้เจ้าหน้าที่เตรียมพร้อมตรวจรับของเข้าคลัง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Requisition Summary Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">สังกัดบริษัท</span>
              <span className="font-semibold text-slate-800">{requisition.company}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">โครงการ / หน้างาน</span>
              <span className="font-semibold text-slate-800 truncate block">
                {requisition.projectName || requisition.destinationSite || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">สาขา</span>
              <span className="font-semibold text-slate-800">{requisition.branch || 'BKK-HQ'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">วันที่เบิก</span>
              <span className="font-semibold text-slate-800">
                {new Date(requisition.date).toLocaleDateString('th-TH')}
              </span>
            </div>
          </div>

          {/* Items Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                เลือกรายการเครื่องมือ / อุปกรณ์ที่นำมาส่งคืน
              </label>
              <span className="text-xs text-slate-500">
                เลือกแล้ว {returnItems.filter(it => it.isSelected).length} จาก {returnItems.length} รายการ
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {returnItems.map(item => {
                const remaining = Math.max(0, item.quantity - item.alreadyReturned);
                const isAlreadyReturned = item.alreadyReturned >= item.quantity;

                return (
                  <div
                    key={item.index}
                    className={`p-3.5 transition-colors ${
                      item.isSelected ? 'bg-emerald-50/30' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={item.isSelected}
                          onChange={() => handleToggleSelect(item.index)}
                          className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <div>
                          <div className="font-medium text-slate-900 text-sm">{item.detail}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>เบิกไป: {item.quantity} {item.unit}</span>
                            {item.alreadyReturned > 0 && (
                              <span className="text-emerald-600 font-medium">
                                (เคยคืนแล้ว {item.alreadyReturned} {item.unit})
                              </span>
                            )}
                            {isAlreadyReturned && (
                              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded">
                                คืนครบแล้ว
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {item.isSelected && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pl-7 sm:pl-0">
                          {/* Returning Quantity */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500">จำนวนส่งคืน:</span>
                            <input
                              type="number"
                              min={1}
                              max={remaining > 0 ? remaining : item.quantity}
                              value={item.returningQuantity}
                              onChange={(e) => handleQtyChange(item.index, parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 text-sm border border-slate-200 rounded-lg text-center font-bold focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="text-xs text-slate-500">{item.unit}</span>
                          </div>

                          {/* Condition Select */}
                          <select
                            value={item.condition}
                            onChange={(e) => handleConditionChange(item.index, e.target.value)}
                            className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="NORMAL">ปกติ (พร้อมใช้งาน)</option>
                            <option value="DAMAGED">ชำรุด / มีรอยตำหนิ</option>
                            <option value="BROKEN">เสียหาย / ใช้งานไม่ได้</option>
                            <option value="LOST">สูญหาย</option>
                          </select>

                          {/* Item Remark */}
                          <input
                            type="text"
                            placeholder="หมายเหตุ (ถ้ามี)"
                            value={item.remark}
                            onChange={(e) => handleRemarkChange(item.index, e.target.value)}
                            className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg flex-1 sm:w-36 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Return Note */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              ข้อความแจ้งสโตร์ / หมายเหตุการส่งคืน
            </label>
            <textarea
              rows={2}
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="ระบุ เช่น นำของมาส่งที่สโตร์บางนา ช่วง 14:00 น. หรือ เครื่องมือทำความสะอาดพร้อมใช้งาน..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Photo Proof Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <ImageIcon size={16} className="text-emerald-600" />
                รูปถ่ายสภาพเครื่องมือก่อนส่งคืน (ถ้ามี ไม่เกิน 4 รูป)
              </label>
              <span className="text-xs text-slate-400">{photos.length}/4 รูป</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((photo, pIdx) => (
                <div key={pIdx} className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="Tool Proof" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(pIdx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 shadow transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {photos.length < 4 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 cursor-pointer transition-all">
                  <Upload size={22} className="mb-1" />
                  <span className="text-xs font-medium">เพิ่มรูปภาพ</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-sm shadow-md hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  กำลังส่งข้อมูล...
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  ยืนยันแจ้งส่งคืนสโตร์
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
