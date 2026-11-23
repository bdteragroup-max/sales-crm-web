"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { Check, X, Camera, Upload, Trash2, Eraser, Loader2, UserCheck, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import { recordSiteHandover } from '@/app/actions/requisitions';
import {
  uploadSelectedPhotoFiles,
  uploadRequisitionPhotoFile,
  ensureUploadedPhotoList,
  ensureUploadedMediaUrl,
  formatServerActionError,
} from '@/app/lib/requisitionPhotoUpload';
import {
  calibrateSignaturePad,
  extractSignatureDataUrlFromPad,
} from './signaturePadHelper';

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
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  const recalibrate = useCallback(() => {
    calibrateSignaturePad(receiverSigPad);
  }, []);

  useEffect(() => {
    if (!isOpen || !requisition || receiverSigFile) return;
    const t1 = setTimeout(recalibrate, 60);
    const t2 = setTimeout(recalibrate, 240);
    window.addEventListener('resize', recalibrate);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', recalibrate);
    };
  }, [isOpen, requisition, receiverSigFile, recalibrate]);

  if (!isOpen || !requisition) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setIsUploadingPhotos(true);
    try {
      const { uploadedUrls, failedMessages } = await uploadSelectedPhotoFiles(
        files,
        'req-pod'
      );
      if (uploadedUrls.length > 0) {
        setDeliveryPhotos((prev) => [...prev, ...uploadedUrls]);
      }
      if (failedMessages.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'อัปโหลดรูปภาพบางส่วนไม่สำเร็จ',
          text: failedMessages[0],
        });
      }
    } finally {
      setIsUploadingPhotos(false);
    }
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

    if (isUploadingPhotos) {
      Swal.fire({
        icon: 'info',
        title: 'กำลังอัปโหลดรูปภาพ',
        text: 'กรุณารอให้อัปโหลดรูปภาพเสร็จสิ้นก่อนกดบันทึก',
      });
      return;
    }

    const rawSignatureData =
      receiverSigFile || extractSignatureDataUrlFromPad(receiverSigPad);

    setIsSubmitting(true);
    try {
      const normalizedSignatureUrl = rawSignatureData
        ? await ensureUploadedMediaUrl(rawSignatureData, 'req-sig', 200_000, {
            maxDimension: 1200,
            quality: 0.85,
            preserveAlpha: true,
          })
        : undefined;
      const uploadedPhotos = await ensureUploadedPhotoList(
        deliveryPhotos,
        'req-pod'
      );
      setDeliveryPhotos(uploadedPhotos);

      const res = await recordSiteHandover(requisition.id, {
        receiverName: receiverName.trim(),
        receiverSignatureUrl: normalizedSignatureUrl,
        deliveryPhotos: uploadedPhotos,
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
    } catch (e: unknown) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: formatServerActionError(e, 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'),
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
                    disabled={isUploadingPhotos}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (!f) return;
                      setIsUploadingPhotos(true);
                      try {
                        const uploadedUrl = await uploadRequisitionPhotoFile(
                          f,
                          'req-sig',
                          { maxDimension: 1200, quality: 0.85, preserveAlpha: true }
                        );
                        setReceiverSigFile(uploadedUrl);
                      } catch (err) {
                        Swal.fire({
                          icon: 'error',
                          title: 'อัปโหลดรูปลายเซ็นไม่สำเร็จ',
                          text: formatServerActionError(err, 'กรุณาลองใหม่อีกครั้ง'),
                        });
                      } finally {
                        setIsUploadingPhotos(false);
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
                  clearOnResize={false}
                  penColor="#0f172a"
                  canvasProps={{
                    className: 'w-full h-36 bg-white cursor-crosshair touch-none block',
                    style: { touchAction: 'none' },
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
              <label
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors ${
                  isUploadingPhotos
                    ? 'opacity-60 cursor-wait'
                    : 'hover:bg-blue-700 cursor-pointer'
                }`}
              >
                {isUploadingPhotos ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Camera size={13} />
                )}
                <span>{isUploadingPhotos ? 'กำลังอัปโหลด...' : 'ถ่ายรูป / เพิ่มรูป'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploadingPhotos}
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
              <label
                className={`border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-slate-400 bg-white transition-colors ${
                  isUploadingPhotos
                    ? 'opacity-70 cursor-wait'
                    : 'hover:text-blue-600 hover:border-blue-300 cursor-pointer'
                }`}
              >
                {isUploadingPhotos ? (
                  <Loader2 size={28} className="mb-1 text-blue-600 animate-spin" />
                ) : (
                  <Camera size={28} className="mb-1 text-slate-400" />
                )}
                <span className="text-xs font-semibold">
                  {isUploadingPhotos
                    ? 'กำลังย่อขนาดและอัปโหลดรูปภาพ...'
                    : 'แตะเพื่อถ่ายรูปของที่ส่งมอบ หรือเลือกรูปภาพจากเครื่อง'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  รองรับไฟล์ JPG, PNG, HEIC ย่อขนาดอัตโนมัติ (ไม่เกิน 25MB/รูป)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploadingPhotos}
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
            disabled={isSubmitting || isUploadingPhotos}
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            disabled={isSubmitting || isUploadingPhotos}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : isUploadingPhotos ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังอัปโหลดรูป...</span>
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
