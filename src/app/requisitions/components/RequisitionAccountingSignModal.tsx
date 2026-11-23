'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import {
  FileCheck2,
  X,
  Eraser,
  Upload,
  Check,
  Loader2,
  UserCheck,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { recordAccountingRelease } from '@/app/actions/requisitions';
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

export interface AccountingSignSuccessPayload {
  accountingId?: string | null;
  accountingName?: string | null;
  accountingSignatureUrl?: string | null;
  accountingSignedAt?: string | null;
}

interface RequisitionAccountingSignModalProps {
  requisition: RequisitionSignatureRecord | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserName?: string;
  isAccountingUser?: boolean;
  savedAccountingSignatureUrl?: string | null;
  onSuccess?: (payload: AccountingSignSuccessPayload) => void;
}

function AccountingSignModalInner({
  requisition,
  onClose,
  currentUserName = '',
  isAccountingUser = false,
  savedAccountingSignatureUrl = null,
  onSuccess,
}: {
  requisition: RequisitionSignatureRecord;
  onClose: () => void;
  currentUserName?: string;
  isAccountingUser?: boolean;
  savedAccountingSignatureUrl?: string | null;
  onSuccess?: (payload: AccountingSignSuccessPayload) => void;
}) {
  const router = useRouter();
  const sigPadRef = useRef<SignatureCanvas | null>(null);

  const [accountingName, setAccountingName] = useState(
    requisition.accountingName || currentUserName || ''
  );
  const [sigImageUrl, setSigImageUrl] = useState<string | null>(
    requisition.accountingSignatureUrl || null
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

  const effectiveSavedSig = isAccountingUser
    ? savedAccountingSignatureUrl || cachedSig || null
    : savedAccountingSignatureUrl || null;

  const handleSubmit = async () => {
    const cleanName = accountingName.trim();
    if (!cleanName) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุชื่อเจ้าหน้าที่แผนกบัญชี',
        text: 'กรอกชื่อผู้เซ็นรับทราบในการปล่อยของออกจากคลังสินค้า',
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
        title: 'กรุณาลงลายเซ็นรับทราบ (แผนกบัญชี)',
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

      if (isAccountingUser) {
        try {
          window.localStorage.setItem('crm_user_signature', uploadedSigUrl);
          setCachedSig(uploadedSigUrl);
        } catch {
          // ignore storage errors
        }
      }

      const res = await recordAccountingRelease(requisition.id, {
        accountingName: cleanName,
        accountingSignatureUrl: uploadedSigUrl,
      });

      if (res.success && res.data) {
        onSuccess?.(res.data);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'บันทึกแผนกบัญชีเซ็นรับทราบปล่อยของเรียบร้อย',
          showConfirmButton: false,
          timer: 2400,
        });
        onClose();
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'บันทึกไม่สำเร็จ',
          text: res.error || 'ไม่สามารถบันทึกลายเซ็นแผนกบัญชีได้',
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

      <div className="relative z-10 bg-white w-full sm:max-w-lg max-h-[92dvh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-violet-50 via-white to-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 truncate">
                แผนกบัญชีเซ็นรับทราบการปล่อยของออก
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="p-3 bg-violet-50/80 border border-violet-200 rounded-2xl text-xs text-violet-900">
            ลงนามรับทราบเพื่อยืนยันการปล่อยวัสดุอุปกรณ์ออกจากคลังสินค้าสำหรับเอกสารฉบับนี้
          </div>

          {/* Accounting Staff Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อ-นามสกุล เจ้าหน้าที่แผนกบัญชีผู้รับทราบ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={accountingName}
                onChange={(e) => setAccountingName(e.target.value)}
                placeholder="กรอกชื่อเจ้าหน้าที่แผนกบัญชี"
                className="w-full h-11 pl-10 pr-3.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
              />
            </div>
          </div>

          {/* Signature Pad */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                ลายเซ็นรับทราบ (แผนกบัญชี) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2.5">
                {effectiveSavedSig && (
                  <button
                    type="button"
                    onClick={() => setSigImageUrl(effectiveSavedSig)}
                    className="px-2.5 py-0.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 text-[11px] font-bold transition-colors"
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
                <label className="text-xs text-violet-600 hover:text-violet-700 inline-flex items-center gap-1 font-bold cursor-pointer">
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
                  alt="Accounting Signature"
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
            className="col-span-2 h-11 sm:px-6 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
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
                <span>ยืนยันบัญชีรับทราบปล่อยของ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RequisitionAccountingSignModal(props: RequisitionAccountingSignModalProps) {
  const mounted = useIsPortalClientReady();
  if (!mounted || !props.isOpen || !props.requisition) return null;

  return createPortal(
    <AccountingSignModalInner
      key={props.requisition.id}
      requisition={props.requisition}
      onClose={props.onClose}
      currentUserName={props.currentUserName}
      isAccountingUser={props.isAccountingUser}
      savedAccountingSignatureUrl={props.savedAccountingSignatureUrl}
      onSuccess={props.onSuccess}
    />,
    document.body
  );
}
