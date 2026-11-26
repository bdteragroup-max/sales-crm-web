'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SignatureCanvas from 'react-signature-canvas';
import {
  Camera,
  Check,
  Eraser,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  completeLogisticsStopPod,
} from '@/app/actions/logistics';
import {
  LOGISTICS_SOURCE_META,
  type LogisticsTripStopItem,
} from '@/app/lib/logisticsTypes';
import {
  ensureUploadedMediaUrl,
  formatServerActionError,
  uploadSelectedPhotoFiles,
} from '@/app/lib/requisitionPhotoUpload';
import {
  calibrateSignaturePad,
  extractSignatureDataUrlFromPad,
  useIsPortalClientReady,
} from '@/app/requisitions/components/signaturePadHelper';

interface StopPodModalProps {
  stop: LogisticsTripStopItem | null;
  tripNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

function StopPodModalInner({
  stop,
  tripNumber,
  onClose,
  onSuccess,
}: {
  stop: LogisticsTripStopItem;
  tripNumber: string;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const sigPadRef = useRef<SignatureCanvas | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'in-house' | 'courier'>(
    stop.deliveryMethod === 'courier' ? 'courier' : 'in-house'
  );
  const [courierCompany, setCourierCompany] = useState(stop.courierCompany || '');
  const [trackingNumber, setTrackingNumber] = useState(stop.trackingNumber || '');
  const [receiverName, setReceiverName] = useState(
    stop.receiverName || stop.contactName || ''
  );
  const [podNote, setPodNote] = useState(stop.podNote || '');
  const [photos, setPhotos] = useState<string[]>(stop.podPhotoUrls || []);
  const [sigImageUrl, setSigImageUrl] = useState<string | null>(
    stop.receiverSignatureUrl || null
  );
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (sigImageUrl) return;
    const calibrate = () => calibrateSignaturePad(sigPadRef);
    const t1 = setTimeout(calibrate, 60);
    const t2 = setTimeout(calibrate, 250);
    window.addEventListener('resize', calibrate);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', calibrate);
    };
  }, [sigImageUrl]);

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingPhotos(true);
    try {
      const { uploadedUrls, failedMessages } = await uploadSelectedPhotoFiles(
        Array.from(files),
        'log-pod',
        { maxDimension: 1600, quality: 0.82 }
      );
      if (uploadedUrls.length > 0) {
        setPhotos((prev) => [...prev, ...uploadedUrls]);
      }
      if (failedMessages.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'อัปโหลดรูปบางไฟล์ไม่สำเร็จ',
          text: failedMessages[0],
        });
      }
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleSubmit = async () => {
    const cleanReceiver = receiverName.trim();
    if (deliveryMethod === 'in-house' && !cleanReceiver) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุชื่อผู้รับสินค้าหน้างาน',
      });
      return;
    }

    const rawSig = sigImageUrl || extractSignatureDataUrlFromPad(sigPadRef);
    if (!rawSig && photos.length === 0 && !trackingNumber.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาแนบหลักฐานการส่งมอบ',
        text: 'ถ่ายรูปส่งมอบ, ให้ผู้รับเซ็นชื่อ หรือระบุเลข Tracking อย่างน้อย 1 รายการ',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedSig = rawSig
        ? await ensureUploadedMediaUrl(rawSig, 'log-sig', 0, {
            maxDimension: 1200,
            quality: 0.85,
            preserveAlpha: true,
          })
        : null;

      let gpsLat: number | null = stop.gpsLat;
      let gpsLng: number | null = stop.gpsLng;
      if (
        (gpsLat === null || gpsLng === null) &&
        typeof navigator !== 'undefined' &&
        navigator.geolocation
      ) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 2500,
            })
          );
          gpsLat = pos.coords.latitude;
          gpsLng = pos.coords.longitude;
        } catch {
          // Optional GPS fallback
        }
      }

      const res = await completeLogisticsStopPod(stop.id, {
        receiverName: cleanReceiver || courierCompany.trim() || 'ผู้รับหน้างาน',
        receiverSignatureUrl: uploadedSig,
        podPhotoUrls: photos,
        podNote: podNote.trim(),
        deliveryMethod,
        courierCompany: courierCompany.trim(),
        trackingNumber: trackingNumber.trim(),
        gpsLat,
        gpsLng,
      });

      if (!res.success) {
        Swal.fire({
          icon: 'error',
          title: 'บันทึก POD ไม่สำเร็จ',
          text: res.error || 'กรุณาลองใหม่อีกครั้ง',
        });
        return;
      }

      await onSuccess();
      onClose();
      Swal.fire({
        toast: !res.syncNotice,
        position: res.syncNotice ? 'center' : 'top-end',
        icon: 'success',
        title: `ปิดจุดส่ง #${stop.stopOrder} สำเร็จ`,
        text: res.syncNotice || undefined,
        timer: res.syncNotice ? 3600 : 2200,
        showConfirmButton: Boolean(res.syncNotice),
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: formatServerActionError(err, 'ไม่สามารถอัปโหลดหรือบันทึก POD ได้'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const srcMeta = LOGISTICS_SOURCE_META[stop.sourceType] || LOGISTICS_SOURCE_META.MANUAL;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/65 backdrop-blur-[2px]">
      <div className="fixed inset-0" onClick={() => !isSubmitting && onClose()} />

      <div className="relative z-10 bg-white w-full sm:max-w-xl max-h-[94dvh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-emerald-700">
                  ปิดจุดส่ง #{stop.stopOrder}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${srcMeta.badge}`}>
                  {srcMeta.short}
                </span>
                {stop.referenceNumber && (
                  <span className="text-[11px] font-mono font-bold text-slate-600">
                    {stop.referenceNumber}
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                {stop.customerName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Quick Destination & Contact Card */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
            <div className="text-[11px] text-slate-500 font-semibold">
              ทริป {tripNumber} {stop.itemSummary ? `· ${stop.itemSummary}` : ''}
            </div>
            {stop.destination && (
              <div className="text-slate-700 font-medium flex items-start gap-1.5">
                <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" />
                <span>{stop.destination}</span>
              </div>
            )}
            {stop.contactPhone && (
              <div className="text-slate-700 font-semibold flex items-center gap-1.5">
                <Phone size={12} className="text-blue-600 shrink-0" />
                <a href={`tel:${stop.contactPhone}`} className="text-blue-700 underline">
                  {stop.contactPhone}
                </a>
                {stop.contactName && <span className="text-slate-500">({stop.contactName})</span>}
              </div>
            )}
          </div>

          {/* Delivery Method Switch */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              วิธีจัดส่งมอบจุดนี้
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryMethod('in-house')}
                className={`h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  deliveryMethod === 'in-house'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Truck size={15} />
                <span>รถบริษัทส่งมอบถึงมือ</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMethod('courier')}
                className={`h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  deliveryMethod === 'courier'
                    ? 'bg-orange-50 text-orange-800 border-orange-400 ring-2 ring-orange-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Truck size={15} />
                <span>ส่งต่อขนส่ง / คูเรียร์</span>
              </button>
            </div>
          </div>

          {deliveryMethod === 'courier' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  บริษัทขนส่ง (Courier)
                </label>
                <input
                  type="text"
                  value={courierCompany}
                  onChange={(e) => setCourierCompany(e.target.value)}
                  placeholder="เช่น Flash, Kerry, Nim Express"
                  className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลขพัสดุ (Tracking No.)
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="ระบุเลขพัสดุ / ใบตราส่ง"
                  className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Receiver Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อผู้รับสินค้าหน้างาน {deliveryMethod === 'in-house' && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="พิมพ์ชื่อ-นามสกุล หรือชื่อเล่นผู้รับหน้างาน"
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Mobile Photo Capture / Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700">
                รูปถ่ายหลักฐานส่งมอบสินค้า (POD Photos)
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {photos.length} รูป
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="h-11 px-3 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                {isUploadingPhotos ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Camera size={15} />
                )}
                <span>ถ่ายรูปหน้างาน</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={isUploadingPhotos || isSubmitting}
                  className="hidden"
                  onChange={(e) => {
                    void handlePhotoUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>

              <label className="h-11 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                {isUploadingPhotos ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Upload size={15} />
                )}
                <span>เลือกจากอัลบั้ม</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploadingPhotos || isSubmitting}
                  className="hidden"
                  onChange={(e) => {
                    void handlePhotoUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {photos.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`POD ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((prev) => prev.filter((_, pIdx) => pIdx !== idx))
                      }
                      aria-label={`ลบรูปที่ ${idx + 1}`}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center shadow cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Receiver Signature Canvas */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                ลายเซ็นผู้รับสินค้า (ให้ลูกค้าเซ็นบนหน้าจอ)
              </label>
              <button
                type="button"
                onClick={() => {
                  setSigImageUrl(null);
                  sigPadRef.current?.clear();
                }}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer"
              >
                <Eraser size={13} /> ล้างลายเซ็น
              </button>
            </div>

            {sigImageUrl ? (
              <div className="relative border border-slate-300 bg-white rounded-xl p-2 h-40 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sigImageUrl}
                  alt="Receiver Signature"
                  className="max-h-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setSigImageUrl(null)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 cursor-pointer"
                  title="เซ็นใหม่"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="relative border-2 border-slate-300 bg-white rounded-xl overflow-hidden">
                <SignatureCanvas
                  ref={sigPadRef}
                  clearOnResize={false}
                  penColor="#0f172a"
                  canvasProps={{
                    className: 'w-full h-40 bg-white cursor-crosshair touch-none block',
                    style: { touchAction: 'none' },
                  }}
                />
                <div className="pointer-events-none absolute bottom-3 left-6 right-6 border-b border-dashed border-slate-200" />
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              หมายเหตุการส่งมอบ (ถ้ามี)
            </label>
            <textarea
              rows={2}
              value={podNote}
              onChange={(e) => setPodNote(e.target.value)}
              placeholder="เช่น วางของหน้าคลังประตู 2, ลูกค้าตรวจรับครบถ้วน"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          {stop.sourceType !== 'MANUAL' && (
            <div className="rounded-xl bg-blue-50/80 border border-blue-200 px-3 py-2 text-[11px] text-blue-900 font-medium">
              เมื่อกดยืนยัน ระบบจะอัปเดตสถานะจัดส่งกลับไปยัง{' '}
              <strong>
                {stop.sourceType === 'JOB'
                  ? `งาน Job ${stop.referenceNumber || ''} (นับผลงาน Gold Coin)`
                  : stop.sourceType === 'REQUISITION'
                  ? `ใบเบิก ${stop.referenceNumber || ''} เป็นส่งมอบเสร็จสิ้น`
                  : `ใบส่งมอบ ${stop.referenceNumber || ''} เป็น Completed`}
              </strong>{' '}
              ให้อัตโนมัติ
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50 grid grid-cols-3 sm:flex sm:items-center sm:justify-end gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isSubmitting || isUploadingPhotos}
            onClick={onClose}
            className="col-span-1 h-11 sm:px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isSubmitting || isUploadingPhotos}
            onClick={handleSubmit}
            className="col-span-2 h-11 sm:px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก POD...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>ยืนยันปิดส่งจุดนี้ (POD)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StopPodModal(props: StopPodModalProps) {
  const ready = useIsPortalClientReady();
  if (!ready || !props.isOpen || !props.stop) return null;

  return createPortal(
    <StopPodModalInner
      key={props.stop.id}
      stop={props.stop}
      tripNumber={props.tripNumber}
      onClose={props.onClose}
      onSuccess={props.onSuccess}
    />,
    document.body
  );
}
