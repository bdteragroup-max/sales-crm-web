'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import {
  Truck,
  X,
  Eraser,
  Upload,
  Check,
  Loader2,
  Building2,
  UserCheck,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { recordTransportPickup } from '@/app/actions/requisitions';
import {
  normalizeRequisitionTransportType,
  type RequisitionTransportMode,
} from '@/app/lib/requisitionUtils';
import {
  uploadRequisitionPhotoFile,
  ensureUploadedMediaUrl,
  formatServerActionError,
} from '@/app/lib/requisitionPhotoUpload';
import {
  calibrateSignaturePad,
  extractSignatureDataUrlFromPad,
  readCachedUserSignature,
  useIsPortalClientReady,
  type RequisitionSignatureRecord,
} from './signaturePadHelper';

export interface TransportSignSuccessPayload {
  transportId?: string | null;
  transportName?: string | null;
  transportType?: string | null;
  transportCompany?: string | null;
  transportSignatureUrl?: string | null;
  transportSignedAt?: string | null;
}

interface RequisitionTransportSignModalProps {
  requisition: RequisitionSignatureRecord | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserName?: string;
  isTransportUser?: boolean;
  savedTransportSignatureUrl?: string | null;
  onSuccess?: (payload: TransportSignSuccessPayload) => void;
}

function TransportSignModalInner({
  requisition,
  onClose,
  currentUserName = '',
  isTransportUser = false,
  savedTransportSignatureUrl = null,
  onSuccess,
}: {
  requisition: RequisitionSignatureRecord;
  onClose: () => void;
  currentUserName?: string;
  isTransportUser?: boolean;
  savedTransportSignatureUrl?: string | null;
  onSuccess?: (payload: TransportSignSuccessPayload) => void;
}) {
  const router = useRouter();
  const sigPadRef = useRef<SignatureCanvas | null>(null);

  const defaultMode: RequisitionTransportMode = requisition.transportType
    ? normalizeRequisitionTransportType(requisition.transportType)
    : isTransportUser
    ? 'INTERNAL'
    : 'EXTERNAL';

  const [transportType, setTransportType] = useState<RequisitionTransportMode>(defaultMode);
  const [transportName, setTransportName] = useState(
    requisition.transportName ||
      (defaultMode === 'INTERNAL' && isTransportUser ? currentUserName : '')
  );
  const [transportCompany, setTransportCompany] = useState(
    requisition.transportCompany || ''
  );
  const [sigImageUrl, setSigImageUrl] = useState<string | null>(
    requisition.transportSignatureUrl || null
  );
  const [cachedSig, setCachedSig] = useState<string | null>(() => readCachedUserSignature());
  const [isUploadingSig, setIsUploadingSig] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recalibrate = useCallback(() => {
    calibrateSignaturePad(sigPadRef);
  }, []);

  useEffect(() => {
    if (sigImageUrl) return;
    const t1 = setTimeout(recalibrate, 60);
    const t2 = setTimeout(recalibrate, 240);
    window.addEventListener('resize', recalibrate);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', recalibrate);
    };
  }, [sigImageUrl, recalibrate]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const effectiveSavedInternalSig = isTransportUser
    ? savedTransportSignatureUrl || cachedSig || null
    : savedTransportSignatureUrl || null;

  const handleModeSwitch = (nextMode: RequisitionTransportMode) => {
    setTransportType(nextMode);
    if (nextMode === 'INTERNAL' && !transportName.trim() && isTransportUser && currentUserName) {
      setTransportName(currentUserName);
    }
  };

  const handleSubmit = async () => {
    const cleanName = transportName.trim();
    if (!cleanName) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุชื่อผู้รับสินค้า (ขนส่ง / คนขับรถ)',
        text: 'กรอกชื่อพนักงานขับรถ หรือผู้แทนขนส่งที่เข้ารับสินค้าออกจากคลัง',
      });
      return;
    }

    if (isUploadingSig) {
      Swal.fire({
        icon: 'info',
        title: 'กำลังอัปโหลดรูปลายเซ็น',
        text: 'กรุณารอสักครู่ก่อนกดบันทึก',
      });
      return;
    }

    const rawSig = sigImageUrl || extractSignatureDataUrlFromPad(sigPadRef);
    if (!rawSig) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาลงลายเซ็นขนส่งผู้รับสินค้า',
        text: 'เซ็นชื่อในกรอบลายเซ็นหรือแนบรูปลายเซ็นก่อนกดบันทึก',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedSigUrl = await ensureUploadedMediaUrl(rawSig, 'req-sig', 200_000, {
        maxDimension: 1200,
        quality: 0.85,
        preserveAlpha: true,
      });

      if (transportType === 'INTERNAL' && isTransportUser) {
        try {
          window.localStorage.setItem('crm_user_signature', uploadedSigUrl);
          setCachedSig(uploadedSigUrl);
        } catch {
          // ignore storage quota errors
        }
      }

      const res = await recordTransportPickup(requisition.id, {
        transportType,
        transportName: cleanName,
        transportCompany: transportCompany.trim(),
        transportSignatureUrl: uploadedSigUrl,
      });

      if (res.success && res.data) {
        onSuccess?.(res.data);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'บันทึกลายเซ็นขนส่งรับสินค้าเรียบร้อย',
          showConfirmButton: false,
          timer: 2400,
        });
        onClose();
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'บันทึกไม่สำเร็จ',
          text: res.error || 'ไม่สามารถบันทึกลายเซ็นขนส่งได้',
        });
      }
    } catch (e: unknown) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: formatServerActionError(e, 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-[2px]">
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && onClose()}
      />

      <div className="relative z-10 bg-white w-full sm:max-w-xl max-h-[92dvh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-orange-50 via-white to-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 truncate">
                ลายเซ็นขนส่ง / ขนส่งนอก เข้ารับสินค้า
              </h3>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                ใบเบิกเลขที่ <strong className="text-slate-700">{requisition.requisitionNumber}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Carrier Type Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ประเภทขนส่งที่เข้ารับสินค้า
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleModeSwitch('EXTERNAL')}
                className={`h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  transportType === 'EXTERNAL'
                    ? 'bg-orange-50 text-orange-800 border-orange-400 ring-2 ring-orange-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Truck size={15} />
                <span>ขนส่งนอก (คูเรียร์ / รถรับจ้าง)</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('INTERNAL')}
                className={`h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  transportType === 'INTERNAL'
                    ? 'bg-blue-50 text-blue-800 border-blue-400 ring-2 ring-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Building2 size={15} />
                <span>ขนส่งบริษัท (พนักงาน)</span>
              </button>
            </div>
          </div>

          {/* Carrier / Vehicle Plate */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {transportType === 'EXTERNAL'
                ? 'ชื่อบริษัทขนส่งนอก / ทะเบียนรถ / เลขTracking (ถ้ามี)'
                : 'ทะเบียนรถ / สายงานจัดส่ง (ถ้ามี)'}
            </label>
            <input
              type="text"
              value={transportCompany}
              onChange={(e) => setTransportCompany(e.target.value)}
              placeholder={
                transportType === 'EXTERNAL'
                  ? 'เช่น Lalamove, Flash Express, Kerry, รถกระบะรับจ้าง 1กข-1234'
                  : 'เช่น รถบริษัท ทะเบียน 2ขค-5678 / สายเหนือ'
              }
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
            />
          </div>

          {/* Driver / Receiver Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อ-นามสกุล ผู้เซ็นรับสินค้า (คนขับ / ตัวแทนขนส่ง) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
                placeholder="ระบุชื่อผู้เข้ารับสินค้าจากคลัง"
                className="w-full h-11 pl-10 pr-3.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
              />
            </div>
          </div>

          {/* Signature Pad */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                ลายเซ็นขนส่ง / ผู้รับสินค้า <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2.5">
                {transportType === 'INTERNAL' && effectiveSavedInternalSig && (
                  <button
                    type="button"
                    onClick={() => setSigImageUrl(effectiveSavedInternalSig)}
                    className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-bold transition-colors"
                  >
                    ดึงลายเซ็นเดิม
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSigImageUrl(null);
                    sigPadRef.current?.clear();
                  }}
                  className="text-xs text-slate-500 hover:text-rose-600 inline-flex items-center gap-1 font-bold"
                >
                  <Eraser size={13} /> ล้างลายเซ็น
                </button>
                <label className="text-xs text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 font-bold cursor-pointer">
                  <Upload size={13} /> แนบรูปลายเซ็น
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingSig}
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (!f) return;
                      setIsUploadingSig(true);
                      try {
                        const uploaded = await uploadRequisitionPhotoFile(f, 'req-sig', {
                          maxDimension: 1200,
                          quality: 0.85,
                          preserveAlpha: true,
                        });
                        setSigImageUrl(uploaded);
                      } catch (err) {
                        Swal.fire({
                          icon: 'error',
                          title: 'อัปโหลดรูปลายเซ็นไม่สำเร็จ',
                          text: formatServerActionError(err, 'กรุณาลองใหม่อีกครั้ง'),
                        });
                      } finally {
                        setIsUploadingSig(false);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {sigImageUrl ? (
              <div className="relative border border-slate-300 bg-white rounded-xl p-2 h-40 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sigImageUrl}
                  alt="Transport Signature"
                  className="max-h-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setSigImageUrl(null)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"
                  title="ลบลายเซ็นเพื่อเซ็นใหม่"
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
            <p className="text-[11px] text-slate-400 mt-1">
              * สำหรับขนส่งนอกสามารถยื่นหน้าจอมือถือ/แท็บเล็ตให้ผู้ขับรถลงนามรับสินค้าได้โดยตรง
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50 grid grid-cols-3 sm:flex sm:items-center sm:justify-end gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isSubmitting || isUploadingSig}
            onClick={onClose}
            className="col-span-1 h-11 sm:px-5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isSubmitting || isUploadingSig}
            onClick={handleSubmit}
            className="col-span-2 h-11 sm:px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : isUploadingSig ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังอัปโหลด...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>บันทึกลายเซ็นขนส่ง</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RequisitionTransportSignModal(props: RequisitionTransportSignModalProps) {
  const mounted = useIsPortalClientReady();
  if (!mounted || !props.isOpen || !props.requisition) return null;

  return createPortal(
    <TransportSignModalInner
      key={props.requisition.id}
      requisition={props.requisition}
      onClose={props.onClose}
      currentUserName={props.currentUserName}
      isTransportUser={props.isTransportUser}
      savedTransportSignatureUrl={props.savedTransportSignatureUrl}
      onSuccess={props.onSuccess}
    />,
    document.body
  );
}
