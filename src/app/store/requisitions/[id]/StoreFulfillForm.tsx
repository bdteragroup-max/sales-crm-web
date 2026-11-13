'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  updateRequisitionStatus,
  returnMaterialRequisition,
  recordStoreFulfill,
  recordSiteHandover,
  confirmUsedRequisitionItems,
} from '@/app/actions/requisitions';
import {
  isNonReturnableRequisitionType,
  getCompletedStatusLabel,
  getNonReturnableLabel,
  getNonReturnableBadgeClass,
} from '@/app/lib/requisitionUtils';
import {
  CheckCircle,
  Loader2,
  Printer,
  RotateCcw,
  Check,
  X,
  Calendar,
  User,
  PackageCheck,
  AlertCircle,
  Layers,
  CheckCircle2,
  Camera,
  Building,
  MapPin,
  Eraser,
  Upload,
  Plus,
  Minus,
  Trash2,
  Smartphone,
  Eye,
  Wrench,
  Building2,
  ShieldCheck,
  ArrowLeft,
  FileSignature,
  Hash,
  MessageSquare,
  ListChecks,
} from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import SignatureCanvas from 'react-signature-canvas';

interface StoreFulfillFormProps {
  requisition: any;
  currentUserName?: string;
  savedStoreSignatureUrl?: string | null;
}

function formatDateTH(raw: any): string {
  if (!raw) return '-';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function extractSignatureDataUrl(padRef: React.RefObject<any>): string | null {
  const pad = padRef.current;
  if (!pad || pad.isEmpty()) return null;
  try {
    return pad.getTrimmedCanvas().toDataURL('image/png');
  } catch {
    try {
      return pad.getCanvas().toDataURL('image/png');
    } catch {
      return null;
    }
  }
}

export default function StoreFulfillForm({
  requisition: initialRequisition,
  currentUserName = 'เจ้าหน้าที่สโตร์',
  savedStoreSignatureUrl = null,
}: StoreFulfillFormProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [localSavedStoreSig, setLocalSavedStoreSig] = useState<string | null>(null);
  const [requisition, setRequisition] = useState(initialRequisition);
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [usedItemChecks, setUsedItemChecks] = useState<boolean[]>(() =>
    (Array.isArray(initialRequisition.items) ? initialRequisition.items : []).map(
      () => true
    )
  );
  const [isSavingUsedItems, setIsSavingUsedItems] = useState(false);
  const [pullStoreSignature, setPullStoreSignature] = useState(false);
  const effectiveSavedStoreSig = savedStoreSignatureUrl || localSavedStoreSig || null;

  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnDate, setReturnDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [returnerName, setReturnerName] = useState<string>(
    requisition.requester?.fullName || requisition.requesterName || ''
  );
  const [receiverName, setReceiverName] = useState<string>(currentUserName);
  const [returnNote, setReturnNote] = useState<string>('');
  const [returnItemsState, setReturnItemsState] = useState<
    Array<{
      index: number;
      isSelected: boolean;
      detail: string;
      quantity: number;
      returnedQuantity: number;
      unit: string;
      condition: string;
      remark: string;
    }>
  >([]);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Handover (Proof of Delivery / Receiver Signature) Modal State
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverReceiverName, setHandoverReceiverName] = useState<string>(
    requisition.receiverName ||
      requisition.requester?.fullName ||
      requisition.requesterName ||
      ''
  );
  const [handoverStoreStaffName, setHandoverStoreStaffName] = useState<string>(
    requisition.storeStaffName || currentUserName || 'เจ้าหน้าที่สโตร์'
  );
  const [handoverDeliveryNote, setHandoverDeliveryNote] = useState<string>(
    requisition.deliveryNote || ''
  );
  const [handoverPhotos, setHandoverPhotos] = useState<string[]>(
    Array.isArray(requisition.deliveryPhotos) ? requisition.deliveryPhotos : []
  );
  const [storeStaffSigFile, setStoreStaffSigFile] = useState<string | null>(null);
  const [receiverSigFile, setReceiverSigFile] = useState<string | null>(null);
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  const storeSigPad = useRef<any>(null);
  const receiverSigPad = useRef<any>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(
    null
  );

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('crm_user_signature');
      if (saved) setLocalSavedStoreSig(saved);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    setRequisition(initialRequisition);
    const list = Array.isArray(initialRequisition.items)
      ? initialRequisition.items
      : [];
    setUsedItemChecks(list.map(() => true));
  }, [initialRequisition]);

  // Lock body scroll when any modal/overlay is open
  const isAnyOverlayOpen =
    isConfirmOpen ||
    isReturnModalOpen ||
    isHandoverModalOpen ||
    Boolean(selectedPhotoPreview);

  useEffect(() => {
    if (!mounted) return;
    if (isAnyOverlayOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isAnyOverlayOpen, mounted]);

  // Calibrate SignatureCanvas internal resolution to match responsive container on mobile/desktop
  const calibrateSignaturePads = useCallback(() => {
    [receiverSigPad, storeSigPad].forEach((ref) => {
      const pad = ref.current;
      if (!pad) return;
      const canvas: HTMLCanvasElement | null = pad.getCanvas?.();
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        const wasEmpty = pad.isEmpty();
        const data = !wasEmpty ? pad.toData() : null;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
        pad.clear();
        if (data && data.length > 0) {
          try {
            pad.fromData(data);
          } catch {
            // ignore restore errors
          }
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!isHandoverModalOpen) return;
    const t1 = setTimeout(calibrateSignaturePads, 60);
    const t2 = setTimeout(calibrateSignaturePads, 250);
    window.addEventListener('resize', calibrateSignaturePads);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', calibrateSignaturePads);
    };
  }, [isHandoverModalOpen, calibrateSignaturePads, receiverSigFile, storeStaffSigFile]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          label: 'รอจัดของ / ส่งมอบ',
          badge: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'RETURN_PENDING':
        return {
          label: 'แจ้งคืนแล้ว (รอตรวจรับ)',
          badge: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
          dot: 'bg-amber-600 animate-ping',
        };
      case 'COMPLETED':
        return {
          label: getCompletedStatusLabel(requisition.requisitionType),
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'RETURNED':
        return {
          label: 'คืนของเรียบร้อย',
          badge: 'bg-teal-50 text-teal-800 border-teal-200',
          dot: 'bg-teal-500',
        };
      case 'PARTIALLY_RETURNED':
        return {
          label: 'คืนบางส่วน',
          badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
        };
      case 'PENDING_APPROVAL':
        return {
          label: 'รออนุมัติ',
          badge: 'bg-yellow-50 text-yellow-800 border-yellow-200',
          dot: 'bg-yellow-500',
        };
      case 'REJECTED':
        return {
          label: 'ไม่อนุมัติ',
          badge: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
        };
      default:
        return {
          label: status || 'ไม่ระบุ',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const itemsList = Array.isArray(requisition.items) ? requisition.items : [];
  const canEditUsedItems =
    requisition.status !== 'RETURNED' &&
    requisition.status !== 'REJECTED' &&
    itemsList.length > 0;
  const keptItems = itemsList.filter(
    (_: any, idx: number) => usedItemChecks[idx] !== false
  );
  const removedCount = itemsList.length - keptItems.length;

  const handleSaveUsedItemsAndOpenPdf = async () => {
    if (canEditUsedItems && keptItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาติ๊กสิ่งที่ใช้จริงอย่างน้อย 1 รายการ',
        text: 'หากไม่ได้เบิกทุกรายการเลย กรุณาปฏิเสธหรือลบใบเบิกแทน',
      });
      return;
    }

    const pdfUrl = `/requisitions/${requisition.id}/pdf`;
    const sigToApply =
      !requisition.storeStaffSignatureUrl && pullStoreSignature && effectiveSavedStoreSig
        ? effectiveSavedStoreSig
        : undefined;

    if (!canEditUsedItems || (removedCount === 0 && !sigToApply)) {
      window.open(pdfUrl, '_blank');
      return;
    }

    // Open tab synchronously inside click gesture so mobile/desktop browsers never block it
    const pdfWin = window.open('', '_blank');
    if (pdfWin) {
      try {
        pdfWin.document.write(`
          <!DOCTYPE html>
          <html lang="th">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>กำลังจัดเตรียมเอกสาร PDF...</title>
              <style>
                body { margin: 0; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; text-align: center; padding: 20px; }
                .spinner { width: 38px; height: 38px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.75s linear infinite; margin-bottom: 14px; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .title { font-size: 15px; font-weight: 700; }
                .sub { font-size: 12px; color: #64748b; margin-top: 6px; }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <div class="title">กำลังอัปเดตรายการที่ใช้จริงและสร้างหน้า PDF...</div>
              <div class="sub">กำลังลบรายการที่ไม่ได้ติ๊ก ${removedCount} รายการออกอัตโนมัติ</div>
            </body>
          </html>
        `);
        pdfWin.document.close();
      } catch {
        // ignore write edge cases
      }
    }

    setIsSavingUsedItems(true);
    try {
      const res = await confirmUsedRequisitionItems(requisition.id, {
        keptItems,
        storeStaffSignatureUrl: sigToApply,
      });

      if (res.success) {
        setRequisition((prev: any) => ({
          ...prev,
          items: keptItems,
          storeStaffSignatureUrl:
            res.storeStaffSignatureUrl || sigToApply || prev.storeStaffSignatureUrl,
          storeStaffName:
            res.storeStaffName || (sigToApply ? currentUserName : prev.storeStaffName),
          dispensedAt: res.dispensedAt || prev.dispensedAt,
        }));
        setUsedItemChecks(keptItems.map(() => true));

        if (pdfWin && !pdfWin.closed) {
          pdfWin.location.replace(pdfUrl);
        } else {
          window.location.href = pdfUrl;
        }

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `ลบรายการที่ไม่ใช้ ${removedCount} รายการอัตโนมัติแล้ว`,
          text: `แสดงหน้า PDF เฉพาะ ${keptItems.length} รายการที่ใช้จริง`,
          showConfirmButton: false,
          timer: 2800,
        });

        router.refresh();
      } else {
        if (pdfWin && !pdfWin.closed) pdfWin.close();
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถอัปเดตรายการในใบเบิกได้',
        });
      }
    } catch (e: any) {
      if (pdfWin && !pdfWin.closed) pdfWin.close();
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
      });
    } finally {
      setIsSavingUsedItems(false);
    }
  };

  const executeComplete = async () => {
    if (canEditUsedItems && keptItems.length === 0) {
      setIsConfirmOpen(false);
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาติ๊กสิ่งที่ใช้จริงอย่างน้อย 1 รายการ',
      });
      return;
    }

    setLoading(true);
    setIsConfirmOpen(false);
    try {
      if (canEditUsedItems && removedCount > 0) {
        const res = await confirmUsedRequisitionItems(requisition.id, {
          keptItems,
          markCompleted: true,
        });
        if (res.success) {
          setRequisition((prev: any) => ({
            ...prev,
            status: 'COMPLETED',
            items: keptItems,
          }));
          setUsedItemChecks(keptItems.map(() => true));
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `ส่งมอบของที่ใช้จริง ${keptItems.length} รายการ (ลบ ${removedCount} รายการที่ไม่ใช้แล้ว)`,
            showConfirmButton: false,
            timer: 2500,
          });
          router.refresh();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: res.error || 'ไม่สามารถอัปเดตสถานะได้',
          });
        }
        return;
      }

      const res = await updateRequisitionStatus(requisition.id, 'COMPLETED');
      if (res.success) {
        setRequisition((prev: any) => ({ ...prev, status: 'COMPLETED' }));
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'บันทึกส่งมอบของเรียบร้อย',
          showConfirmButton: false,
          timer: 2000,
        });
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถอัปเดตสถานะได้',
        });
      }
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
      });
    } finally {
      setLoading(false);
    }
  };

  const openReturnModal = () => {
    const items = Array.isArray(requisition.items) ? requisition.items : [];
    const initialItems = items.map((it: any, idx: number) => {
      const origQty = Number(it.quantity) || 1;
      const prevReturnedQty =
        it.returnedQuantity !== undefined ? Number(it.returnedQuantity) : origQty;
      return {
        index: idx,
        isSelected: true,
        detail: it.detail || `รายการที่ ${idx + 1}`,
        quantity: origQty,
        returnedQuantity: prevReturnedQty,
        unit: it.unit || 'ชิ้น',
        condition: it.returnCondition || 'NORMAL',
        remark: it.returnRemark || '',
      };
    });
    setReturnItemsState(initialItems);
    setReturnDate(new Date().toISOString().slice(0, 10));
    setReturnerName(
      requisition.requester?.fullName || requisition.requesterName || ''
    );
    setReceiverName(currentUserName);
    setReturnNote(requisition.returnRequestNote || '');
    setIsReturnModalOpen(true);
  };

  const handleSubmitReturn = async () => {
    const selectedItems = returnItemsState.filter((it) => it.isSelected);
    if (selectedItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกรายการที่คืน',
        text: 'ต้องมีรายการอุปกรณ์ที่เลือกรับคืนอย่างน้อย 1 รายการ',
      });
      return;
    }

    const allItemsSelected = returnItemsState.every(
      (it) => it.isSelected && it.returnedQuantity >= it.quantity
    );
    const targetStatus = allItemsSelected ? 'RETURNED' : 'PARTIALLY_RETURNED';

    setIsSubmittingReturn(true);
    try {
      const res = await returnMaterialRequisition(requisition.id, {
        status: targetStatus,
        returnedItems: selectedItems.map((it) => ({
          index: it.index,
          returnedQuantity: it.returnedQuantity,
          returnDate: returnDate,
          returnCondition: it.condition,
          returnRemark: it.remark,
        })),
        returnNote,
        returnerName,
        receiverName,
      });

      if (res.success) {
        const currentItems = Array.isArray(requisition.items)
          ? requisition.items
          : [];
        const updatedItems = currentItems.map((it: any, idx: number) => {
          const retInfo = returnItemsState.find(
            (ri) => ri.index === idx && ri.isSelected
          );
          if (retInfo) {
            return {
              ...it,
              returnedQuantity: retInfo.returnedQuantity,
              returnDate,
              returnCondition: retInfo.condition,
              returnRemark: retInfo.remark,
              returnReceiver: receiverName,
              returnerName,
            };
          }
          return it;
        });

        setRequisition((prev: any) => ({
          ...prev,
          status: targetStatus,
          items: updatedItems,
        }));

        setIsReturnModalOpen(false);

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title:
            targetStatus === 'RETURNED'
              ? 'บันทึกรับคืนของครบถ้วนเรียบร้อย'
              : 'บันทึกรับคืนของบางส่วนเรียบร้อย',
          showConfirmButton: false,
          timer: 2500,
        });

        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถบันทึกรับคืนได้',
        });
      }
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
      });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const openHandoverModal = () => {
    setHandoverReceiverName(
      requisition.receiverName ||
        requisition.requester?.fullName ||
        requisition.requesterName ||
        ''
    );
    setHandoverStoreStaffName(
      requisition.storeStaffName || currentUserName || 'เจ้าหน้าที่สโตร์'
    );
    setHandoverDeliveryNote(requisition.deliveryNote || '');
    setHandoverPhotos(
      Array.isArray(requisition.deliveryPhotos) ? requisition.deliveryPhotos : []
    );
    setIsHandoverModalOpen(true);
  };

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
          setHandoverPhotos((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setHandoverPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmitHandover = async () => {
    if (!handoverReceiverName.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุชื่อผู้รับของหน้างาน' });
      return;
    }

    if (canEditUsedItems && keptItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาติ๊กสิ่งที่ใช้จริงอย่างน้อย 1 รายการ',
      });
      return;
    }

    setIsSubmittingHandover(true);
    try {
      if (canEditUsedItems && removedCount > 0) {
        const pruneRes = await confirmUsedRequisitionItems(requisition.id, {
          keptItems,
        });
        if (!pruneRes.success) {
          Swal.fire({
            icon: 'error',
            title: 'ไม่สามารถอัปเดตรายการที่ใช้จริงได้',
            text: pruneRes.error,
          });
          setIsSubmittingHandover(false);
          return;
        }
      }

      const storeSigData =
        storeStaffSigFile || extractSignatureDataUrl(storeSigPad);
      const receiverSigData =
        receiverSigFile || extractSignatureDataUrl(receiverSigPad);

      if (!requisition.storeStaffSignatureUrl && storeSigData) {
        try {
          localStorage.setItem('crm_user_signature', storeSigData);
          setLocalSavedStoreSig(storeSigData);
        } catch {
          // ignore storage quota edge cases
        }
        await recordStoreFulfill(requisition.id, {
          storeStaffName: handoverStoreStaffName,
          storeStaffSignatureUrl: storeSigData,
          deliveryNote: handoverDeliveryNote,
        });
      }

      const res = await recordSiteHandover(requisition.id, {
        receiverName: handoverReceiverName,
        receiverSignatureUrl:
          receiverSigData || requisition.receiverSignatureUrl || undefined,
        deliveryPhotos: handoverPhotos,
        deliveryNote: handoverDeliveryNote,
      });

      if (res.success) {
        setRequisition((prev: any) => ({
          ...prev,
          status: 'COMPLETED',
          items: canEditUsedItems && removedCount > 0 ? keptItems : prev.items,
          receiverName: handoverReceiverName,
          receiverSignatureUrl: receiverSigData || prev.receiverSignatureUrl,
          storeStaffName: handoverStoreStaffName || prev.storeStaffName,
          storeStaffSignatureUrl: storeSigData || prev.storeStaffSignatureUrl,
          deliveryPhotos: handoverPhotos,
          deliveryNote: handoverDeliveryNote,
          receivedAt: new Date().toISOString(),
        }));
        if (canEditUsedItems && removedCount > 0) {
          setUsedItemChecks(keptItems.map(() => true));
        }

        Swal.fire({
          icon: 'success',
          title: 'บันทึกตรวจรับของสำเร็จ',
          text: 'ระบบได้บันทึกข้อมูลและแนบรูปถ่ายเข้าโครงการเรียบร้อยแล้ว',
          timer: 2500,
          showConfirmButton: false,
        });
        setIsHandoverModalOpen(false);
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถบันทึกได้',
        });
      }
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้',
      });
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const statusInfo = getStatusInfo(requisition.status);
  const hasReturnedItems =
    requisition.status === 'RETURNED' ||
    requisition.status === 'PARTIALLY_RETURNED' ||
    itemsList.some((it: any) => it.returnedQuantity !== undefined);

  const requesterDisplay =
    requisition.requester?.fullName || requisition.requesterName || '-';

  // Reusable Action Buttons Block (adapts seamlessly to mobile full-width grid & desktop flex)
  const renderActionButtons = (compact = false) => (
    <div
      className={
        compact
          ? 'grid grid-cols-1 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2.5'
          : 'grid grid-cols-1 sm:flex sm:flex-wrap items-stretch sm:items-center sm:justify-end gap-2.5'
      }
    >
      {/* Primary Mobile-Friendly Handover / POD Button */}
      <button
        type="button"
        onClick={openHandoverModal}
        className="min-h-[44px] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-xs transition-all"
      >
        <Smartphone size={17} className="shrink-0" />
        <span>ตรวจรับหน้างาน (เซ็นรับ + รูปถ่าย)</span>
      </button>

      {requisition.status === 'PENDING_APPROVAL' && (
        <Link
          href={`/requisitions/${requisition.id}/approve`}
          className="min-h-[44px] px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          <CheckCircle2 size={17} className="shrink-0" />
          <span>อนุมัติใบเบิก (Approve)</span>
        </Link>
      )}

      {requisition.status === 'APPROVED' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => setIsConfirmOpen(true)}
          className="min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin shrink-0" size={17} />
          ) : (
            <CheckCircle size={17} className="shrink-0" />
          )}
          <span>ส่งมอบเรียบร้อย (ด่วน)</span>
        </button>
      )}

      {!isNonReturnableRequisitionType(requisition.requisitionType) &&
        (requisition.status === 'COMPLETED' ||
          requisition.status === 'PARTIALLY_RETURNED' ||
          requisition.status === 'RETURN_PENDING') && (
          <button
            type="button"
            onClick={openReturnModal}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-xs transition-all ${
              requisition.status === 'RETURN_PENDING'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <RotateCcw size={17} className="shrink-0" />
            <span>
              {requisition.status === 'RETURN_PENDING'
                ? 'ตรวจรับคืนเข้าสโตร์'
                : requisition.status === 'PARTIALLY_RETURNED'
                ? 'บันทึกรับคืนเพิ่มเติม'
                : 'บันทึกรับคืนของ'}
            </span>
          </button>
        )}

      {requisition.status === 'RETURNED' && (
        <button
          type="button"
          onClick={openReturnModal}
          className="min-h-[44px] px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors"
        >
          <RotateCcw size={16} className="text-teal-600 shrink-0" />
          <span>ดู / แก้ไขการคืนของ</span>
        </button>
      )}

      {!compact && (
        <button
          type="button"
          disabled={isSavingUsedItems || (canEditUsedItems && keptItems.length === 0)}
          onClick={handleSaveUsedItemsAndOpenPdf}
          className={`min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
            canEditUsedItems && removedCount > 0
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          {isSavingUsedItems ? (
            <Loader2 size={16} className="animate-spin shrink-0" />
          ) : (
            <Printer
              size={16}
              className={`shrink-0 ${
                canEditUsedItems && removedCount > 0 ? 'text-white' : 'text-slate-500'
              }`}
            />
          )}
          <span>
            {canEditUsedItems && removedCount > 0
              ? `ยืนยันสิ่งที่ใช้ (${keptItems.length}) & แสดง PDF (ลบ ${removedCount} รายการ)`
              : 'พิมพ์ PDF 4 ลายเซ็น'}
          </span>
        </button>
      )}
    </div>
  );

  // Overlays rendered via Portal at document.body so z-index sits cleanly above Sidebar mobile trigger (z-50)
  const overlays = mounted
    ? createPortal(
        <>
          {/* 1. Confirm Quick Complete Modal */}
          {isConfirmOpen && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-[2px]">
              <div
                className="fixed inset-0"
                onClick={() => !loading && setIsConfirmOpen(false)}
              />
              <div className="relative z-10 bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle size={22} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-base font-black text-slate-900">
                      ยืนยันการจัดส่งมอบของ
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      ยืนยันว่าคลังสินค้าได้จัดเตรียมและส่งมอบอุปกรณ์ใบเบิก{' '}
                      <strong className="text-slate-800">
                        {requisition.requisitionNumber}
                      </strong>{' '}
                      เรียบร้อยแล้วใช่หรือไม่?
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 pb-2 sm:pb-0">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setIsConfirmOpen(false)}
                    className="h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={executeComplete}
                    className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black text-white inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Check size={15} />
                    )}
                    <span>ยืนยันส่งมอบ</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Return Modal (Mobile Bottom-Sheet + Mobile Item Cards / Desktop Table) */}
          {isReturnModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-[2px]">
              <div
                className="fixed inset-0"
                onClick={() =>
                  !isSubmittingReturn && setIsReturnModalOpen(false)
                }
              />

              <div className="relative z-10 bg-white w-full sm:max-w-4xl h-[92dvh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                {/* Sticky Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-teal-50/70 via-white to-slate-50 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                        บันทึกรับคืนวัสดุและอุปกรณ์
                      </h2>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        เลขที่{' '}
                        <strong className="text-slate-700">
                          {requisition.requisitionNumber}
                        </strong>{' '}
                        • ผู้ขอเบิก {requesterDisplay}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      !isSubmittingReturn && setIsReturnModalOpen(false)
                    }
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 text-xs text-slate-700">
                  {/* Return Header Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" />
                        <span>วันที่รับคืน *</span>
                      </label>
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-600" />
                        <span>ผู้ส่งคืนอุปกรณ์ *</span>
                      </label>
                      <input
                        type="text"
                        value={returnerName}
                        onChange={(e) => setReturnerName(e.target.value)}
                        placeholder="ระบุชื่อผู้ส่งคืน"
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <PackageCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span>เจ้าหน้าที่รับคืน *</span>
                      </label>
                      <input
                        type="text"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="ระบุชื่อเจ้าหน้าที่รับคืน"
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        หมายเหตุภาพรวมการรับคืน (ถ้ามี)
                      </label>
                      <input
                        type="text"
                        value={returnNote}
                        onChange={(e) => setReturnNote(e.target.value)}
                        placeholder="เช่น ส่งคืนหลังเสร็จงานติดตั้ง ตรวจสอบสภาพแล้วปกติ"
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Quick Selection Toolbar */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-teal-600" />
                        <span className="text-xs font-black text-slate-900">
                          รายการที่รับคืน ({returnItemsState.filter((i) => i.isSelected).length}/
                          {returnItemsState.length})
                        </span>
                      </div>

                      <div className="grid grid-cols-3 sm:flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setReturnItemsState((prev) =>
                              prev.map((it) => ({ ...it, isSelected: true }))
                            )
                          }
                          className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          เลือกทั้งหมด
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setReturnItemsState((prev) =>
                              prev.map((it) => ({
                                ...it,
                                isSelected: true,
                                returnedQuantity: it.quantity,
                              }))
                            )
                          }
                          className="h-8 px-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          คืนครบทุกชิ้น
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setReturnItemsState((prev) =>
                              prev.map((it) => ({ ...it, isSelected: false }))
                            )
                          }
                          className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          ล้างที่เลือก
                        </button>
                      </div>
                    </div>

                    {/* Mobile Return Item Cards (No horizontal scrolling!) */}
                    <div className="md:hidden space-y-2.5">
                      {returnItemsState.map((item) => (
                        <div
                          key={item.index}
                          className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                            item.isSelected
                              ? 'bg-white border-teal-300 shadow-2xs'
                              : 'bg-slate-50/70 border-slate-200 opacity-65'
                          }`}
                        >
                          <label className="flex items-start justify-between gap-3 cursor-pointer">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={item.isSelected}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setReturnItemsState((prev) =>
                                    prev.map((it) =>
                                      it.index === item.index
                                        ? { ...it, isSelected: checked }
                                        : it
                                    )
                                  );
                                }}
                                className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 leading-snug">
                                  {item.index + 1}. {item.detail}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  เบิกไปทั้งหมด:{' '}
                                  <strong className="text-slate-800">
                                    {item.quantity} {item.unit}
                                  </strong>
                                </p>
                              </div>
                            </div>
                          </label>

                          {item.isSelected && (
                            <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-100">
                              <div>
                                <span className="block text-[10px] font-bold text-slate-500 mb-1">
                                  จำนวนรับคืน ({item.unit})
                                </span>
                                <div className="flex items-center h-9 border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReturnItemsState((prev) =>
                                        prev.map((it) =>
                                          it.index === item.index
                                            ? {
                                                ...it,
                                                returnedQuantity: Math.max(
                                                  0,
                                                  it.returnedQuantity - 1
                                                ),
                                              }
                                            : it
                                        )
                                      )
                                    }
                                    className="w-9 h-full flex items-center justify-center text-slate-600 active:bg-slate-200"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={item.quantity}
                                    value={item.returnedQuantity}
                                    onChange={(e) => {
                                      const val = Math.max(
                                        0,
                                        Math.min(
                                          item.quantity,
                                          Number(e.target.value) || 0
                                        )
                                      );
                                      setReturnItemsState((prev) =>
                                        prev.map((it) =>
                                          it.index === item.index
                                            ? { ...it, returnedQuantity: val }
                                            : it
                                        )
                                      );
                                    }}
                                    className="w-full h-full bg-white text-center font-black text-xs text-slate-900 outline-none border-x border-slate-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReturnItemsState((prev) =>
                                        prev.map((it) =>
                                          it.index === item.index
                                            ? {
                                                ...it,
                                                returnedQuantity: Math.min(
                                                  it.quantity,
                                                  it.returnedQuantity + 1
                                                ),
                                              }
                                            : it
                                        )
                                      )
                                    }
                                    className="w-9 h-full flex items-center justify-center text-slate-600 active:bg-slate-200"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              </div>

                              <div>
                                <span className="block text-[10px] font-bold text-slate-500 mb-1">
                                  สภาพอุปกรณ์
                                </span>
                                <select
                                  value={item.condition}
                                  onChange={(e) => {
                                    const c = e.target.value;
                                    setReturnItemsState((prev) =>
                                      prev.map((it) =>
                                        it.index === item.index
                                          ? { ...it, condition: c }
                                          : it
                                      )
                                    );
                                  }}
                                  className="w-full h-9 px-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                                >
                                  <option value="NORMAL">ปกติ (พร้อมใช้)</option>
                                  <option value="DAMAGED">ชำรุด (ส่งซ่อม)</option>
                                  <option value="LOST">สูญหาย</option>
                                </select>
                              </div>

                              <div className="col-span-2">
                                <input
                                  type="text"
                                  value={item.remark}
                                  onChange={(e) => {
                                    const r = e.target.value;
                                    setReturnItemsState((prev) =>
                                      prev.map((it) =>
                                        it.index === item.index
                                          ? { ...it, remark: r }
                                          : it
                                      )
                                    );
                                  }}
                                  placeholder="หมายเหตุเฉพาะรายการนี้ (ถ้ามี)..."
                                  className="w-full h-9 px-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop Return Table */}
                    <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                            <th className="py-2.5 px-3 w-12 text-center">รับคืน</th>
                            <th className="py-2.5 px-3 w-10 text-center">#</th>
                            <th className="py-2.5 px-3">รายละเอียดสิ่งของ</th>
                            <th className="py-2.5 px-3 text-center w-24">เบิกไป</th>
                            <th className="py-2.5 px-3 text-center w-36">จำนวนรับคืน</th>
                            <th className="py-2.5 px-3 w-40">สภาพอุปกรณ์</th>
                            <th className="py-2.5 px-3">หมายเหตุเฉพาะรายการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {returnItemsState.map((item) => (
                            <tr
                              key={item.index}
                              className={`transition-colors ${
                                item.isSelected
                                  ? 'bg-teal-50/20 hover:bg-teal-50/40'
                                  : 'bg-slate-50/40 opacity-60'
                              }`}
                            >
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.isSelected}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setReturnItemsState((prev) =>
                                      prev.map((it) =>
                                        it.index === item.index
                                          ? { ...it, isSelected: checked }
                                          : it
                                      )
                                    );
                                  }}
                                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-3 text-center text-slate-400 font-mono">
                                {item.index + 1}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900">
                                  {item.detail}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  หน่วยนับ: {item.unit}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-700">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    max={item.quantity}
                                    disabled={!item.isSelected}
                                    value={item.returnedQuantity}
                                    onChange={(e) => {
                                      const val = Math.max(
                                        0,
                                        Math.min(
                                          item.quantity,
                                          Number(e.target.value) || 0
                                        )
                                      );
                                      setReturnItemsState((prev) =>
                                        prev.map((it) =>
                                          it.index === item.index
                                            ? { ...it, returnedQuantity: val }
                                            : it
                                        )
                                      );
                                    }}
                                    className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                                  />
                                  <span className="text-[11px] text-slate-500">
                                    {item.unit}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <select
                                  disabled={!item.isSelected}
                                  value={item.condition}
                                  onChange={(e) => {
                                    const c = e.target.value;
                                    setReturnItemsState((prev) =>
                                      prev.map((it) =>
                                        it.index === item.index
                                          ? { ...it, condition: c }
                                          : it
                                      )
                                    );
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                                >
                                  <option value="NORMAL">สภาพปกติ (พร้อมใช้)</option>
                                  <option value="DAMAGED">ชำรุด (ส่งซ่อม)</option>
                                  <option value="LOST">สูญหาย</option>
                                </select>
                              </td>
                              <td className="py-3 px-3">
                                <input
                                  type="text"
                                  disabled={!item.isSelected}
                                  value={item.remark}
                                  onChange={(e) => {
                                    const r = e.target.value;
                                    setReturnItemsState((prev) =>
                                      prev.map((it) =>
                                        it.index === item.index
                                          ? { ...it, remark: r }
                                          : it
                                      )
                                    );
                                  }}
                                  placeholder="หมายเหตุ..."
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50 grid grid-cols-3 sm:flex sm:items-center sm:justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={isSubmittingReturn}
                    onClick={() => setIsReturnModalOpen(false)}
                    className="col-span-1 h-11 sm:px-5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingReturn}
                    onClick={handleSubmitReturn}
                    className="col-span-2 h-11 sm:px-6 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSubmittingReturn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>บันทึกรับคืนของเข้าสโตร์</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Handover & Proof of Delivery Modal (Mobile Bottom-Sheet + Touch-Safe Signature Pads) */}
          {isHandoverModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-[2px]">
              <div
                className="fixed inset-0"
                onClick={() =>
                  !isSubmittingHandover && setIsHandoverModalOpen(false)
                }
              />

              <div className="relative z-10 bg-white w-full sm:max-w-3xl h-[93dvh] sm:h-auto sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                {/* Sticky Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-blue-50/70 via-white to-slate-50 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                        ตรวจรับของหน้างาน (POD)
                      </h2>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        เลขที่{' '}
                        <strong className="text-slate-700">
                          {requisition.requisitionNumber}
                        </strong>{' '}
                        • สาขา {requisition.branch || 'BKK-HQ'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      !isSubmittingHandover && setIsHandoverModalOpen(false)
                    }
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                  {/* Step 1: Receiver */}
                  <div className="space-y-3 p-3.5 sm:p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
                    <label className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        1. ผู้รับของหน้างาน (Receiver){' '}
                        <span className="text-rose-500">*</span>
                      </span>
                    </label>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        ชื่อ-นามสกุล ผู้รับของ
                      </label>
                      <input
                        type="text"
                        value={handoverReceiverName}
                        onChange={(e) => setHandoverReceiverName(e.target.value)}
                        placeholder="เช่น สมชาย ใจดี (โฟร์แมน / วิศวกรโครงการ)"
                        className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <label className="text-[11px] font-bold text-slate-600">
                          ลายเซ็นผู้รับของ (ใช้นิ้วลากเซ็นบนกรอบด้านล่าง)
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => receiverSigPad.current?.clear()}
                            className="text-xs text-slate-500 hover:text-rose-600 inline-flex items-center gap-1 font-bold"
                          >
                            <Eraser size={13} /> ล้างลายเซ็น
                          </button>
                          <label className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 font-bold cursor-pointer">
                            <Upload size={13} /> แนบรูปลายเซ็น
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  const r = new FileReader();
                                  r.onload = (ev) =>
                                    setReceiverSigFile(
                                      ev.target?.result as string
                                    );
                                  r.readAsDataURL(f);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      {receiverSigFile ? (
                        <div className="relative border border-slate-300 bg-white rounded-xl p-2 h-40 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={receiverSigFile}
                            alt="Receiver Signature"
                            className="max-h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => setReceiverSigFile(null)}
                            className="absolute top-2 right-2 p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <div className="relative border-2 border-slate-300 bg-white rounded-xl overflow-hidden">
                          <SignatureCanvas
                            ref={receiverSigPad}
                            penColor="#0f172a"
                            canvasProps={{
                              className:
                                'w-full h-40 bg-white cursor-crosshair touch-none block',
                              style: { touchAction: 'none' },
                            }}
                          />
                          <div className="pointer-events-none absolute bottom-3 left-6 right-6 border-b border-dashed border-slate-200" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Store Staff (if not signed yet) */}
                  {!requisition.storeStaffSignatureUrl && (
                    <div className="space-y-3 p-3.5 sm:p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
                      <label className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                        <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>2. เจ้าหน้าที่สโตร์ / ผู้จ่ายของ</span>
                      </label>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          ชื่อผู้เบิก-จ่าย
                        </label>
                        <input
                          type="text"
                          value={handoverStoreStaffName}
                          onChange={(e) =>
                            setHandoverStoreStaffName(e.target.value)
                          }
                          placeholder="ชื่อเจ้าหน้าที่สโตร์"
                          className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label className="text-[11px] font-bold text-slate-600">
                            ลายเซ็นผู้จ่ายของ
                          </label>
                          <div className="flex items-center gap-2">
                            {(savedStoreSignatureUrl || localSavedStoreSig) && (
                              <button
                                type="button"
                                onClick={() =>
                                  setStoreStaffSigFile(
                                    savedStoreSignatureUrl || localSavedStoreSig
                                  )
                                }
                                className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-bold transition-colors"
                              >
                                ดึงลายเซ็นเดิม
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setStoreStaffSigFile(null);
                                storeSigPad.current?.clear();
                              }}
                              className="text-xs text-slate-500 hover:text-rose-600 inline-flex items-center gap-1 font-bold"
                            >
                              <Eraser size={13} /> ล้างลายเซ็น
                            </button>
                          </div>
                        </div>

                        {storeStaffSigFile ? (
                          <div className="relative border border-slate-300 bg-white rounded-xl p-2 h-36 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={storeStaffSigFile}
                              alt="Store Staff Signature"
                              className="max-h-full object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => setStoreStaffSigFile(null)}
                              className="absolute top-2 right-2 p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <div className="relative border-2 border-slate-300 bg-white rounded-xl overflow-hidden">
                            <SignatureCanvas
                              ref={storeSigPad}
                              penColor="#0f172a"
                              canvasProps={{
                                className:
                                  'w-full h-36 bg-white cursor-crosshair touch-none block',
                                style: { touchAction: 'none' },
                              }}
                            />
                            <div className="pointer-events-none absolute bottom-3 left-6 right-6 border-b border-dashed border-slate-200" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Proof Photos */}
                  <div className="space-y-3 p-3.5 sm:p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>3. รูปถ่ายหลักฐานส่งมอบ ({handoverPhotos.length})</span>
                      </label>

                      <label className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0">
                        <Plus size={14} />
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

                    {handoverPhotos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {handoverPhotos.map((photoUrl, pIdx) => (
                          <div
                            key={pIdx}
                            className="relative aspect-video rounded-xl overflow-hidden border border-slate-300 bg-slate-900/5"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoUrl}
                              alt={`Photo ${pIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(pIdx)}
                              className="absolute top-1.5 right-1.5 w-7 h-7 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center shadow-sm"
                              title="ลบรูปนี้"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 rounded-2xl p-5 flex flex-col items-center justify-center text-center text-slate-500 hover:text-emerald-600 hover:border-emerald-300 bg-white cursor-pointer transition-colors">
                        <Camera size={26} className="mb-1.5 text-slate-400" />
                        <span className="text-xs font-bold">
                          แตะเพื่อถ่ายรูปด้วยกล้องมือถือ หรือเลือกรูปจากอัลบั้ม
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          รองรับ JPG, PNG ขนาดไม่เกิน 8MB
                        </span>
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

                  {/* Step 4: Delivery Note */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      4. หมายเหตุการส่งมอบ / จุดวางของ
                    </label>
                    <textarea
                      rows={2}
                      value={handoverDeliveryNote}
                      onChange={(e) => setHandoverDeliveryNote(e.target.value)}
                      placeholder="เช่น ส่งมอบครบถ้วนที่หน้างาน Zone C ชั้น 2..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50 grid grid-cols-3 sm:flex sm:items-center sm:justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={isSubmittingHandover}
                    onClick={() => setIsHandoverModalOpen(false)}
                    className="col-span-1 h-11 sm:px-5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingHandover}
                    onClick={handleSubmitHandover}
                    className="col-span-2 h-11 sm:px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSubmittingHandover ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>ยืนยันบันทึกตรวจรับของ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. Photo Lightbox Overlay */}
          {selectedPhotoPreview && (
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
              onClick={() => setSelectedPhotoPreview(null)}
            >
              <button
                type="button"
                onClick={() => setSelectedPhotoPreview(null)}
                className="fixed top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhotoPreview}
                alt="Proof Preview"
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-[86dvh] rounded-2xl object-contain shadow-2xl"
              />
            </div>
          )}
        </>,
        document.body
      )
    : null;

  return (
    <div className="space-y-4 sm:space-y-5">
      {overlays}

      {/* ─── LAYER 1: TOP NAVIGATION + HERO IDENTITY & METADATA CARD ─── */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Top Navigation Strip */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2">
          <Link
            href="/store/requisitions"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 py-1 transition-colors"
          >
            <ArrowLeft size={15} />
            <span>รายการเบิก/ยืมสโตร์</span>
          </Link>

          <button
            type="button"
            disabled={isSavingUsedItems || (canEditUsedItems && keptItems.length === 0)}
            onClick={handleSaveUsedItemsAndOpenPdf}
            className={`h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 ${
              canEditUsedItems && removedCount > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {isSavingUsedItems ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Printer
                size={14}
                className={
                  canEditUsedItems && removedCount > 0
                    ? 'text-white'
                    : 'text-slate-500'
                }
              />
            )}
            <span>
              {canEditUsedItems && removedCount > 0
                ? `ยืนยัน (${keptItems.length}) & PDF`
                : 'พิมพ์ PDF'}
            </span>
          </button>
        </div>

        {/* Hero Identity & Quick Actions */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight">
                  {requisition.requisitionNumber}
                </span>

                {requisition.requisitionType === 'CLAIM' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-violet-50 text-violet-800 border border-violet-200">
                    <ShieldCheck size={12} className="text-violet-600 shrink-0" />
                    <span>รายการเคลม (ไม่คืนของ)</span>
                  </span>
                ) : requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Wrench size={12} className="text-amber-600 shrink-0" />
                    <span>เบิกยืมอุปกรณ์สโตร์</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    <Building2 size={12} className="text-blue-600 shrink-0" />
                    <span>เบิกของงานโครงการ (ไม่คืนของ)</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 font-medium">
                {isNonReturnableRequisitionType(requisition.requisitionType)
                  ? 'ตรวจสอบรายการวัสดุอุปกรณ์ จัดส่งมอบ และตรวจรับหน้างาน (ไม่มีการคืนของ)'
                  : 'ตรวจสอบรายการวัสดุอุปกรณ์ จัดส่งมอบ ตรวจรับหน้างาน และรับคืนเข้าคลัง'}
              </p>
            </div>

            <span
              className={`self-start inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border shrink-0 ${statusInfo.badge}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
              <span>{statusInfo.label}</span>
            </span>
          </div>

          {/* Primary Thumb-Friendly Actions on Top Layer */}
          <div className="pt-1">{renderActionButtons(true)}</div>

          {/* Core Metadata Grid (2-col on Mobile, 4-col on Desktop — Full readable text, no truncation!) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <p className="text-[11px] font-semibold text-slate-400">วันที่ทำรายการ</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                {formatDateTH(requisition.date)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <p className="text-[11px] font-semibold text-slate-400">บริษัท / สังกัด</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 break-words">
                {requisition.company || '-'} • {requisition.branch || 'BKK-HQ'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <p className="text-[11px] font-semibold text-slate-400">ผู้ขอเบิก</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 break-words">
                {requesterDisplay}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <p className="text-[11px] font-semibold text-slate-400">
                {requisition.requisitionType === 'CLAIM'
                  ? 'กำหนดส่งมอบเคลม'
                  : requisition.requisitionType === 'BORROW_EQUIPMENT'
                  ? 'กำหนดส่งคืนสโตร์'
                  : 'วันส่งของหน้างาน'}
              </p>
              <p
                className={`text-xs sm:text-sm font-black mt-0.5 ${
                  requisition.requisitionType === 'BORROW_EQUIPMENT'
                    ? 'text-rose-600'
                    : requisition.requisitionType === 'CLAIM'
                    ? 'text-violet-700'
                    : 'text-blue-700'
                }`}
              >
                {requisition.deliveryDate
                  ? formatDateTH(requisition.deliveryDate)
                  : 'ไม่ระบุ'}
              </p>
            </div>

            {/* Project / Objective & Full Site Address Row (Full width on mobile so nothing gets cut off) */}
            <div className="col-span-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <p className="text-[11px] font-semibold text-slate-400">
                {requisition.requisitionType === 'CLAIM'
                  ? 'ชื่องานเคลม / ลูกค้า'
                  : requisition.requisitionType === 'BORROW_EQUIPMENT'
                  ? 'วัตถุประสงค์ในการยืม'
                  : 'โครงการ / ชื่องานติดตั้ง'}
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 break-words leading-snug">
                {requisition.requisitionType === 'BORROW_EQUIPMENT'
                  ? requisition.deliveryNote || '-'
                  : requisition.projectName || itemsList[0]?.job || '-'}
              </p>
            </div>

            <div className="col-span-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <MapPin size={11} className="text-slate-400" />
                <span>
                  {requisition.requisitionType === 'CLAIM'
                    ? 'สถานที่จัดส่ง & สาเหตุการเคลม'
                    : requisition.requisitionType === 'BORROW_EQUIPMENT'
                    ? 'สถานที่นำไปใช้งาน'
                    : 'สถานที่จัดส่ง / ไซต์งาน'}
                </span>
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5 break-words leading-snug">
                {requisition.destinationSite || '-'}
                {requisition.requisitionType !== 'BORROW_EQUIPMENT' &&
                requisition.deliveryNote
                  ? ` • ${requisition.deliveryNote}`
                  : ''}
                {requisition.requisitionType === 'BORROW_EQUIPMENT' &&
                requisition.projectName
                  ? ` (โครงการ: ${requisition.projectName})`
                  : ''}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LAYER 2: CONTEXTUAL ALERTS / RETURN STATUS ─── */}
      {(requisition.status === 'RETURN_PENDING' ||
        requisition.returnRequestedAt) && (
        <section className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <RotateCcw size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-amber-950 text-xs sm:text-sm">
                  พนักงานแจ้งขอส่งคืนอุปกรณ์เข้าสโตร์แล้ว
                </span>
                <span className="text-[11px] bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full font-bold">
                  รอตรวจรับ
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1">
                เวลาที่แจ้ง:{' '}
                {requisition.returnRequestedAt
                  ? new Date(requisition.returnRequestedAt).toLocaleString('th-TH')
                  : '-'}
              </p>
              {requisition.returnRequestNote && (
                <p className="text-xs font-semibold text-amber-950 mt-1 bg-white/70 rounded-lg px-2.5 py-1.5 border border-amber-200/80">
                  หมายเหตุ: &ldquo;{requisition.returnRequestNote}&rdquo;
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {Array.isArray(requisition.returnRequestPhotos) &&
              requisition.returnRequestPhotos.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-amber-900 font-bold">
                    รูปแนบแจ้งคืน:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {requisition.returnRequestPhotos.map(
                      (img: string, idx: number) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={img}
                          alt="Return Proof"
                          onClick={() => setSelectedPhotoPreview(img)}
                          className="w-10 h-10 rounded-lg object-cover border-2 border-white shadow-xs cursor-pointer"
                        />
                      )
                    )}
                  </div>
                </div>
              )}

            <button
              type="button"
              onClick={openReturnModal}
              className="w-full sm:w-auto min-h-[42px] px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-xs inline-flex items-center justify-center gap-1.5 transition-colors sm:ml-auto"
            >
              <RotateCcw size={15} />
              <span>ตรวจรับคืนเดี๋ยวนี้</span>
            </button>
          </div>
        </section>
      )}

      {hasReturnedItems && (
        <section className="p-4 sm:p-5 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-black text-teal-900 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-teal-600 shrink-0" />
              <span>ข้อมูลการรับคืนอุปกรณ์เข้าคลัง</span>
            </span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                requisition.status === 'RETURNED'
                  ? 'bg-teal-100 text-teal-800 border-teal-300'
                  : 'bg-indigo-100 text-indigo-800 border-indigo-200'
              }`}
            >
              {requisition.status === 'RETURNED' ? 'คืนครบถ้วน' : 'คืนบางส่วน'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-white/80 border border-teal-200/70 rounded-xl px-3 py-2">
              <span className="text-[11px] text-slate-500 block">วันที่รับคืน</span>
              <span className="font-bold text-slate-900">
                {itemsList.find((it: any) => it.returnDate)?.returnDate
                  ? formatDateTH(
                      itemsList.find((it: any) => it.returnDate).returnDate
                    )
                  : '-'}
              </span>
            </div>
            <div className="bg-white/80 border border-teal-200/70 rounded-xl px-3 py-2">
              <span className="text-[11px] text-slate-500 block">ผู้ส่งคืน</span>
              <span className="font-bold text-slate-900">
                {itemsList.find((it: any) => it.returnerName)?.returnerName ||
                  requesterDisplay}
              </span>
            </div>
            <div className="bg-white/80 border border-teal-200/70 rounded-xl px-3 py-2">
              <span className="text-[11px] text-slate-500 block">
                เจ้าหน้าที่รับคืน
              </span>
              <span className="font-bold text-slate-900">
                {itemsList.find((it: any) => it.returnReceiver)?.returnReceiver ||
                  '-'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ─── LAYER 3: ITEMS LIST CARD (MOBILE CARDS + DESKTOP TABLE) ─── */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#ff2301] shrink-0" />
              <span>รายการวัสดุ / อุปกรณ์</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {itemsList.length} รายการ
            </span>
            {canEditUsedItems && (
              <>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                  ใช้จริง {keptItems.length}/{itemsList.length}
                </span>
                {removedCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                    ลบอัตโนมัติ {removedCount}
                  </span>
                )}
              </>
            )}
          </div>

          {canEditUsedItems && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setUsedItemChecks(itemsList.map(() => true))}
                className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
              >
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setUsedItemChecks(itemsList.map(() => false))}
                className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold transition-colors"
              >
                ล้างที่เลือก
              </button>
            </div>
          )}
        </div>

        {canEditUsedItems && (
          <div className="px-4 sm:px-6 py-2.5 bg-indigo-50/70 border-b border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-[11px] sm:text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
              <ListChecks size={15} className="text-indigo-600 shrink-0" />
              <span>
                ติ๊กเครื่องหมายถูกเฉพาะรายการที่ใช้จริง แล้วกดแสดงหน้า PDF ส่วนรายการที่ไม่ติ๊กจะถูกลบออกอัตโนมัติ
              </span>
            </p>
          </div>
        )}

        {/* Mobile Cards View (Zero Horizontal Scroll!) */}
        <div className="md:hidden divide-y divide-slate-100">
          {itemsList.map((item: any, index: number) => {
            const origQty = Number(item.quantity) || 1;
            const hasRet = item.returnedQuantity !== undefined;
            const retQty = Number(item.returnedQuantity) || 0;
            const isChecked = usedItemChecks[index] !== false;

            return (
              <div
                key={index}
                onClick={() => {
                  if (!canEditUsedItems) return;
                  setUsedItemChecks((prev) => {
                    const copy = itemsList.map((_: any, i: number) => prev[i] !== false);
                    copy[index] = !isChecked;
                    return copy;
                  });
                }}
                className={`p-4 space-y-2.5 transition-colors ${
                  canEditUsedItems ? 'cursor-pointer active:bg-slate-50 ' : ''
                }${
                  !canEditUsedItems || isChecked
                    ? 'bg-white'
                    : 'bg-rose-50/40 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {canEditUsedItems && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setUsedItemChecks((prev) => {
                            const copy = itemsList.map(
                              (_: any, i: number) => prev[i] !== false
                            );
                            copy[index] = next;
                            return copy;
                          });
                        }}
                        className="mt-1 w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                      />
                    )}
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-bold leading-snug break-words ${
                          !canEditUsedItems || isChecked
                            ? 'text-slate-900'
                            : 'text-slate-400 line-through'
                        }`}
                      >
                        {item.detail || '-'}
                      </p>
                      {(requisition.requisitionType === 'BORROW_EQUIPMENT' ||
                        requisition.requisitionType === 'CLAIM') &&
                        item.assetCode && (
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                            <Hash size={11} />
                            <span>SN/รหัส: {item.assetCode}</span>
                          </p>
                        )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-xl border text-xs font-black whitespace-nowrap ${
                        !canEditUsedItems || isChecked
                          ? 'bg-red-50 text-[#ff2301] border-red-100'
                          : 'bg-white text-slate-400 border-slate-200 line-through'
                      }`}
                    >
                      {item.quantity} {item.unit || 'ชิ้น'}
                    </span>
                    {canEditUsedItems && !isChecked && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                        ไม่ใช้ • ลบอัตโนมัติ
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-8 text-xs">
                  {requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      สภาพก่อนยืม: {item.condition || 'ปกติ'}
                    </span>
                  ) : item.job ? (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      งาน: {item.job}
                    </span>
                  ) : null}

                  {isNonReturnableRequisitionType(requisition.requisitionType) ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${getNonReturnableBadgeClass(requisition.requisitionType)}`}>
                      {getNonReturnableLabel(requisition.requisitionType, true)}
                    </span>
                  ) : hasRet ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        retQty >= origQty
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : retQty > 0
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {retQty >= origQty
                        ? `คืนครบ (${retQty}/${origQty})`
                        : retQty > 0
                        ? `คืนแล้ว ${retQty}/${origQty}`
                        : 'ยังไม่คืน'}
                    </span>
                  ) : requisition.status === 'COMPLETED' ? (
                    <span className="text-[11px] text-slate-400 font-medium">
                      ยังไม่บันทึกคืน
                    </span>
                  ) : null}
                </div>

                {(item.returnRemark || item.remark) && (
                  <div className="ml-8 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-start gap-1.5">
                    <MessageSquare size={12} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      {item.returnRemark
                        ? `หมายเหตุคืน: ${item.returnRemark}`
                        : item.remark}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-600">
                {canEditUsedItems && (
                  <th className="px-4 py-3 w-16 text-center">ใช้จริง</th>
                )}
                <th className="px-4 py-3 w-14 text-center">ลำดับ</th>
                <th className="px-4 py-3">
                  {requisition.requisitionType === 'CLAIM'
                    ? 'รายการสินค้า / อะไหล่เคลม'
                    : requisition.requisitionType === 'BORROW_EQUIPMENT'
                    ? 'ชื่อเครื่องมือ / อุปกรณ์'
                    : 'รายการวัสดุ / อุปกรณ์'}
                </th>
                {(requisition.requisitionType === 'BORROW_EQUIPMENT' ||
                  requisition.requisitionType === 'CLAIM') && (
                  <th className="px-4 py-3 w-32">รหัส / Serial No.</th>
                )}
                <th className="px-4 py-3 text-right w-24">จำนวน</th>
                <th className="px-4 py-3 w-24">หน่วย</th>
                {requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
                  <th className="px-4 py-3 w-36">สภาพก่อนยืม</th>
                ) : requisition.requisitionType === 'CLAIM' ? (
                  <th className="px-4 py-3">งานเคลม / ลูกค้า</th>
                ) : (
                  <th className="px-4 py-3">งานที่ใช้ / Sub-Job</th>
                )}
                <th className="px-4 py-3">สถานะการคืน</th>
                <th className="px-4 py-3">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {itemsList.map((item: any, index: number) => {
                const origQty = Number(item.quantity) || 1;
                const hasRet = item.returnedQuantity !== undefined;
                const retQty = Number(item.returnedQuantity) || 0;
                const isChecked = usedItemChecks[index] !== false;

                return (
                  <tr
                    key={index}
                    onClick={() => {
                      if (!canEditUsedItems) return;
                      setUsedItemChecks((prev) => {
                        const copy = itemsList.map(
                          (_: any, i: number) => prev[i] !== false
                        );
                        copy[index] = !isChecked;
                        return copy;
                      });
                    }}
                    className={`transition-colors ${
                      canEditUsedItems ? 'cursor-pointer ' : ''
                    }${
                      !canEditUsedItems || isChecked
                        ? 'hover:bg-slate-50/60'
                        : 'bg-rose-50/40 opacity-75'
                    }`}
                  >
                    {canEditUsedItems && (
                      <td
                        className="px-4 py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setUsedItemChecks((prev) => {
                              const copy = itemsList.map(
                                (_: any, i: number) => prev[i] !== false
                              );
                              copy[index] = next;
                              return copy;
                            });
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-center text-slate-400 font-bold text-xs">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <span
                        className={
                          !canEditUsedItems || isChecked
                            ? ''
                            : 'line-through text-slate-400'
                        }
                      >
                        {item.detail}
                      </span>
                      {canEditUsedItems && !isChecked && (
                        <span className="ml-2 inline-flex px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                          ไม่ใช้ • ลบอัตโนมัติ
                        </span>
                      )}
                    </td>
                    {(requisition.requisitionType === 'BORROW_EQUIPMENT' ||
                      requisition.requisitionType === 'CLAIM') && (
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {item.assetCode || '-'}
                      </td>
                    )}
                    <td
                      className={`px-4 py-3 font-black text-right tabular-nums ${
                        !canEditUsedItems || isChecked
                          ? 'text-slate-900'
                          : 'text-slate-400 line-through'
                      }`}
                    >
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-semibold">
                      {item.unit}
                    </td>
                    {requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
                      <td className="px-4 py-3 text-xs text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">
                          {item.condition || 'ปกติ'}
                        </span>
                      </td>
                    ) : (
                      <td className="px-4 py-3 text-slate-700 text-xs">
                        {item.job || '-'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {isNonReturnableRequisitionType(requisition.requisitionType) ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getNonReturnableBadgeClass(requisition.requisitionType)}`}>
                          {getNonReturnableLabel(requisition.requisitionType)}
                        </span>
                      ) : hasRet ? (
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              retQty >= origQty
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : retQty > 0
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            {retQty >= origQty
                              ? `คืนครบ (${retQty}/${origQty})`
                              : retQty > 0
                              ? `คืนแล้ว ${retQty}/${origQty}`
                              : 'ยังไม่คืน'}
                          </span>
                          {item.returnCondition && (
                            <div className="text-[11px] text-slate-500">
                              สภาพ:{' '}
                              {item.returnCondition === 'NORMAL'
                                ? 'ปกติ'
                                : item.returnCondition === 'DAMAGED'
                                ? 'ชำรุด'
                                : item.returnCondition === 'LOST'
                                ? 'สูญหาย'
                                : item.returnCondition}
                            </div>
                          )}
                        </div>
                      ) : requisition.status === 'COMPLETED' ? (
                        <span className="text-xs text-slate-400">
                          ยังไม่บันทึกคืน
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {item.returnRemark ? (
                        <span className="text-teal-700 font-semibold">
                          คืน: {item.returnRemark}
                        </span>
                      ) : (
                        item.remark || '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Layer 3 Action Bar: Confirm Used Items -> Auto-Delete Unused -> Open PDF */}
        {canEditUsedItems && (
          <div
            className={`px-4 sm:px-6 py-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              removedCount > 0
                ? 'bg-indigo-50/70 border-indigo-200/80'
                : 'bg-slate-50/60 border-slate-100'
            }`}
          >
            <div className="text-xs text-slate-700">
              {removedCount > 0 ? (
                <span>
                  เลือกสิ่งที่ใช้จริง{' '}
                  <strong className="text-emerald-700">
                    {keptItems.length} รายการ
                  </strong>{' '}
                  • ระบบจะลบ{' '}
                  <strong className="text-rose-600">
                    {removedCount} รายการที่ไม่ได้ติ๊ก
                  </strong>{' '}
                  ออกให้อัตโนมัติเมื่อกดแสดง PDF
                </span>
              ) : (
                <span className="text-slate-500">
                  ขณะนี้ติ๊กเลือกครบทั้ง {itemsList.length} รายการ (เอาเครื่องหมายถูกออกในรายการที่ไม่ใช้เพื่อลบอัตโนมัติ)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {!requisition.storeStaffSignatureUrl && effectiveSavedStoreSig && (
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-indigo-50/70 border border-indigo-200 text-indigo-800 text-xs font-bold cursor-pointer select-none transition-colors">
                  <input
                    type="checkbox"
                    checked={pullStoreSignature}
                    onChange={(e) => setPullStoreSignature(e.target.checked)}
                    className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>ดึงลายเซ็นผู้จ่ายคลังเดิมมาใส่ใน PDF</span>
                </label>
              )}

              <button
                type="button"
                disabled={isSavingUsedItems || keptItems.length === 0}
                onClick={handleSaveUsedItemsAndOpenPdf}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 transition-all shrink-0 disabled:opacity-50 ${
                  removedCount > 0 || pullStoreSignature
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                {isSavingUsedItems ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>กำลังอัปเดต &amp; สร้าง PDF...</span>
                  </>
                ) : (
                  <>
                    <Printer size={15} />
                    <span>
                      {removedCount > 0
                        ? `ยืนยันสิ่งที่ใช้ (${keptItems.length}) & แสดงหน้า PDF`
                        : `แสดงหน้า PDF (${keptItems.length} รายการ)`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ─── LAYER 4: 4-PARTY SIGNATURES CARD ─── */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-blue-600 shrink-0" />
            <span>สถานะการลงนาม 4 ฝ่าย</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            ผู้ขอเบิก • ผู้อนุมัติ • ผู้จ่ายคลัง • ผู้รับหน้างาน
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              step: '1. ผู้ขอเบิก',
              sigUrl: requisition.requesterSignatureUrl,
              name: requesterDisplay,
              emptyText: 'ไม่มีลายเซ็น',
              emptyClass: 'text-slate-400',
            },
            {
              step: '2. ผู้อนุมัติ',
              sigUrl: requisition.approverSignatureUrl,
              name:
                requisition.approver?.fullName || requisition.approverName || '-',
              emptyText: 'รออนุมัติ',
              emptyClass: 'text-slate-400',
            },
            {
              step: '3. ผู้จ่ายของ (คลัง)',
              sigUrl:
                requisition.storeStaffSignatureUrl ||
                (pullStoreSignature ? effectiveSavedStoreSig : null),
              name:
                requisition.storeStaffName ||
                (pullStoreSignature ? currentUserName : 'เจ้าหน้าที่สโตร์'),
              emptyText: 'ยังไม่ลงนามจ่าย',
              emptyClass: 'text-amber-600',
            },
            {
              step: '4. ผู้รับหน้างาน',
              sigUrl: requisition.receiverSignatureUrl,
              name: requisition.receiverName || 'ผู้รับของหน้างาน',
              emptyText: 'ยังไม่เซ็นรับ',
              emptyClass: 'text-rose-600',
            },
          ].map((box) => (
            <div
              key={box.step}
              className="flex flex-col p-3 rounded-2xl border border-slate-200/80 bg-slate-50/60"
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-[11px] font-bold text-slate-700 truncate">
                  {box.step}
                </span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    box.sigUrl ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </div>

              <div className="w-full h-[76px] flex items-center justify-center bg-white rounded-xl border border-slate-200/90 p-1.5">
                {box.sigUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={box.sigUrl}
                    alt={box.step}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className={`text-[11px] font-semibold ${box.emptyClass}`}>
                    {box.emptyText}
                  </span>
                )}
              </div>

              <p className="text-[11px] font-bold text-slate-800 mt-2 text-center truncate w-full">
                ({box.name})
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── LAYER 5: PROOF OF DELIVERY PHOTOS + BOTTOM ACTIONS ─── */}
      {Array.isArray(requisition.deliveryPhotos) &&
        requisition.deliveryPhotos.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Camera size={16} className="text-emerald-600 shrink-0" />
                <span>
                  รูปถ่ายหลักฐานการส่งมอบ ({requisition.deliveryPhotos.length} รูป)
                </span>
              </h3>
              {requisition.deliveryNote && (
                <span className="text-xs text-slate-500 break-words">
                  หมายเหตุ: {requisition.deliveryNote}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {requisition.deliveryPhotos.map((photoUrl: string, pIdx: number) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => setSelectedPhotoPreview(photoUrl)}
                  className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt={`Proof ${pIdx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/55 text-white flex items-center justify-center">
                    <Eye size={13} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

      {/* Bottom Action Card (Convenient after scrolling long item lists) */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5">
        {renderActionButtons(false)}
      </section>
    </div>
  );
}
