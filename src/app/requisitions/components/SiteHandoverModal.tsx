"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { Check, X, Camera, Upload, Trash2, Eraser, Loader2, UserCheck, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import { recordSiteHandover } from '@/app/actions/requisitions';

interface Props {
  requisition: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SiteHandoverModal({ requisition, isOpen, onClose, onSuccess }: Props) {
  const router = useRouter();
  const receiverSigPad = useRef<SignatureCanvas | null>(null);

  const [receiverName, setReceiverName] = useState(
    requisition?.receiverName || requisition?.requester?.fullName || ''
  );
  const [receiverSigFile, setReceiverSigFile] = useState<string | null>(
    requisition?.receiverSignatureUrl || null
  );
  const [deliveryPhotos, setDeliveryPhotos] = useState<string[]>(
    Array.isArray(requisition?.deliveryPhotos) ? requisition.deliveryPhotos : []
  );
  const [deliveryNote, setDeliveryNote] = useState(requisition?.deliveryNote || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !requisition) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        Swal.fire({ icon: 'warning', title: 'ไฟล์มีขนาดใหญ่เกิน 8MB' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setDeliveryPhotos((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setDeliveryPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    if (!receiverName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุชื่อผู้รับของหน้างาน',
        text: 'โปรดกรอกชื่อ-นามสกุล หรือตำแหน่งของผู้ตรวจรับสินค้าหน้างาน',
      });
      return;
    }

    let signatureData = receiverSigFile;
    if (!signatureData && receiverSigPad.current && !receiverSigPad.current.isEmpty()) {
      signatureData = receiverSigPad.current.getTrimmedCanvas().toDataURL('image/png');
    }

    setIsSubmitting(true);
    try {
      const res = await recordSiteHandover(requisition.id, {
        receiverName: receiverName.trim(),
        receiverSignatureUrl: signatureData || undefined,
        deliveryPhotos,
        deliveryNote: deliveryNote.trim(),
      });

      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'บันทึกตรวจรับสินค้าหน้างานสำเร็จ',
          text: 'ระบบได้บันทึกการลงนามและแนบรูปถ่ายการตรวจรับสินค้าเรียบร้อยแล้ว',
          timer: 2000,
          showConfirmButton: false,
        });
        onSuccess?.();
        onClose();
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถบันทึกตรวจรับได้',
        });
      }
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <UserCheck size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                ลงนามตรวจรับสินค้าหน้างาน (Site Delivery Acceptance)
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                ใบเบิกเลขที่: <span className="font-mono font-semibold">{requisition.requisitionNumber}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-slate-800">
          {/* Info Alert */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
            <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">การตรวจรับสินค้าหน้างานโครงการ:</span>
              ผู้ตรวจรับของหน้างานสามารถลงนามผ่านหน้าจอมือถือ/แท็บเล็ตได้โดยตรง พร้อมถ่ายรูปของที่จัดส่ง เพื่อบันทึกลงในเอกสารส่งมอบสินค้าและใบเบิกอัตโนมัติ
            </div>
          </div>

          {/* 1. Receiver Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ชื่อ-นามสกุล ผู้ตรวจรับของหน้างาน <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="เช่น สมชาย ใจดี (โฟร์แมน / วิศวกรโครงการ / ผู้รับเหมา)"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-medium"
            />
          </div>

          {/* 2. Signature Pad */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                ลายเซ็นผู้รับของหน้างาน (เซ็นบนหน้าจอด้วยนิ้ว/ปากกา หรือแนบรูป)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    receiverSigPad.current?.clear();
                    setReceiverSigFile(null);
                  }}
                  className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold"
                >
                  <Eraser size={12} /> ล้างลายเซ็น
                </button>
                <label className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold cursor-pointer">
                  <Upload size={12} /> แนบรูปลายเซ็น
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const r = new FileReader();
                        r.onload = (ev) => setReceiverSigFile(ev.target?.result as string);
                        r.readAsDataURL(f);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {receiverSigFile ? (
              <div className="relative border border-slate-300 bg-white rounded-2xl p-3 h-36 flex items-center justify-center shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receiverSigFile} alt="Receiver Signature" className="max-h-full object-contain" />
                <button
                  type="button"
                  onClick={() => setReceiverSigFile(null)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs hover:bg-rose-100"
                  title="ลบลายเซ็นนี้"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="border border-slate-300 bg-white rounded-2xl overflow-hidden shadow-inner">
                <SignatureCanvas
                  ref={receiverSigPad}
                  canvasProps={{
                    className: 'w-full h-36 bg-white cursor-crosshair',
                  }}
                />
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1 italic">
              * ลากนิ้วบนหน้าจอมือถือเพื่อลงลายเซ็น หรือใช้รูปถ่ายลายเซ็น
            </p>
          </div>

          {/* 3. Photo Proof Upload */}
          <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Camera size={15} className="text-blue-600" />
                <span>ภาพถ่ายการตรวจรับสินค้า / กองวัสดุหน้างาน (Proof of Delivery)</span>
              </label>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs transition-colors">
                <Camera size={13} />
                <span>ถ่ายรูป / เพิ่มรูป</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>

            {deliveryPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {deliveryPhotos.map((photoUrl, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-video rounded-xl overflow-hidden border border-slate-300 bg-black/5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg opacity-90 hover:opacity-100 shadow-sm"
                      title="ลบรูปนี้"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 bg-white cursor-pointer transition-colors">
                <Camera size={28} className="mb-1 text-slate-400" />
                <span className="text-xs font-semibold">แตะเพื่อถ่ายรูปของที่ส่งมอบ หรือเลือกรูปภาพจากเครื่อง</span>
                <span className="text-[10px] text-slate-400 mt-0.5">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 8MB</span>
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

          {/* 4. Delivery / Location Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              หมายเหตุการส่งมอบ / สถานที่วางของ
            </label>
            <textarea
              rows={2}
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="เช่น ตรวจนับครบถ้วน 26 รายการ วางไว้ที่หน้างาน Zone B, อาคาร 1..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-medium"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>บันทึกตรวจรับสินค้าหน้างาน</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
