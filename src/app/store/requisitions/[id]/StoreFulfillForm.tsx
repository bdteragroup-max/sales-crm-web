"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateRequisitionStatus, returnMaterialRequisition, recordStoreFulfill, recordSiteHandover } from '@/app/actions/requisitions';
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
  Image as ImageIcon,
  Building,
  MapPin,
  Eraser,
  Upload,
  Plus,
  Trash2,
  Smartphone,
  Eye,
  Wrench,
  Building2,
  Bell,
} from 'lucide-react';
import ConfirmModal from '@/app/components/ConfirmModal';
import Link from 'next/link';
import Swal from 'sweetalert2';
import SignatureCanvas from 'react-signature-canvas';

interface StoreFulfillFormProps {
  requisition: any;
  currentUserName?: string;
}

export default function StoreFulfillForm({
  requisition: initialRequisition,
  currentUserName = 'เจ้าหน้าที่สโตร์',
}: StoreFulfillFormProps) {
  const router = useRouter();
  const [requisition, setRequisition] = useState(initialRequisition);
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [returnerName, setReturnerName] = useState<string>(
    requisition.requester?.fullName || requisition.requesterName || ''
  );
  const [receiverName, setReceiverName] = useState<string>(currentUserName);
  const [returnNote, setReturnNote] = useState<string>('');
  const [returnItemsState, setReturnItemsState] = useState<Array<{
    index: number;
    isSelected: boolean;
    detail: string;
    quantity: number;
    returnedQuantity: number;
    unit: string;
    condition: string;
    remark: string;
  }>>([]);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Handover (Proof of Delivery / Receiver Signature) Modal State
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverReceiverName, setHandoverReceiverName] = useState<string>(
    requisition.receiverName || requisition.requester?.fullName || requisition.requesterName || ''
  );
  const [handoverStoreStaffName, setHandoverStoreStaffName] = useState<string>(
    requisition.storeStaffName || currentUserName || 'เจ้าหน้าที่สโตร์'
  );
  const [handoverDeliveryNote, setHandoverDeliveryNote] = useState<string>(requisition.deliveryNote || '');
  const [handoverPhotos, setHandoverPhotos] = useState<string[]>(
    Array.isArray(requisition.deliveryPhotos) ? requisition.deliveryPhotos : []
  );
  const [storeStaffSigFile, setStoreStaffSigFile] = useState<string | null>(null);
  const [receiverSigFile, setReceiverSigFile] = useState<string | null>(null);
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  const storeSigPad = useRef<any>(null);
  const receiverSigPad = useRef<any>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'รอจัดของ / ส่งมอบ', badge: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'RETURN_PENDING':
        return { label: 'แจ้งคืนแล้ว (รอตรวจรับ)', badge: 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse' };
      case 'COMPLETED':
        return { label: 'ส่งมอบแล้ว (รอคืน/ใช้งาน)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'RETURNED':
        return { label: 'คืนของเรียบร้อย', badge: 'bg-teal-100 text-teal-800 border-teal-200' };
      case 'PARTIALLY_RETURNED':
        return { label: 'คืนบางส่วน', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'PENDING_APPROVAL':
        return { label: 'รออนุมัติ', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'REJECTED':
        return { label: 'ไม่อนุมัติ', badge: 'bg-rose-100 text-rose-800 border-rose-200' };
      default:
        return { label: status || 'ไม่ระบุ', badge: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const handleCompleteClick = () => {
    setIsConfirmOpen(true);
  };

  const executeComplete = async () => {
    setLoading(true);
    setIsConfirmOpen(false);
    try {
      const res = await updateRequisitionStatus(requisition.id, "COMPLETED");
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

  // Open Return Modal
  const openReturnModal = () => {
    const items = Array.isArray(requisition.items) ? requisition.items : [];
    const initialItems = items.map((it: any, idx: number) => {
      const origQty = Number(it.quantity) || 1;
      const prevReturnedQty = it.returnedQuantity !== undefined ? Number(it.returnedQuantity) : origQty;
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
    setReturnerName(requisition.requester?.fullName || requisition.requesterName || '');
    setReceiverName(currentUserName);
    setReturnNote(requisition.returnRequestNote || '');
    setIsReturnModalOpen(true);
  };

  // Submit Return
  const handleSubmitReturn = async () => {
    const selectedItems = returnItemsState.filter(it => it.isSelected);
    if (selectedItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกรายการที่คืน',
        text: 'ต้องมีรายการอุปกรณ์ที่เลือกรับคืนอย่างน้อย 1 รายการ',
      });
      return;
    }

    const allItemsSelected = returnItemsState.every(it => it.isSelected && it.returnedQuantity >= it.quantity);
    const targetStatus = allItemsSelected ? 'RETURNED' : 'PARTIALLY_RETURNED';

    setIsSubmittingReturn(true);
    try {
      const res = await returnMaterialRequisition(requisition.id, {
        status: targetStatus,
        returnedItems: returnItemsState.filter(it => it.isSelected).map(it => ({
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
        const currentItems = Array.isArray(requisition.items) ? requisition.items : [];
        const updatedItems = currentItems.map((it: any, idx: number) => {
          const retInfo = returnItemsState.find(ri => ri.index === idx && ri.isSelected);
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
          title: targetStatus === 'RETURNED'
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

  // Open Handover Modal
  const openHandoverModal = () => {
    setHandoverReceiverName(requisition.receiverName || requisition.requester?.fullName || requisition.requesterName || '');
    setHandoverStoreStaffName(requisition.storeStaffName || currentUserName || 'เจ้าหน้าที่สโตร์');
    setHandoverDeliveryNote(requisition.deliveryNote || '');
    setHandoverPhotos(Array.isArray(requisition.deliveryPhotos) ? requisition.deliveryPhotos : []);
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

    setIsSubmittingHandover(true);
    try {
      const storeSigData = storeStaffSigFile || (storeSigPad.current && !storeSigPad.current.isEmpty() ? storeSigPad.current.getTrimmedCanvas().toDataURL('image/png') : null);
      const receiverSigData = receiverSigFile || (receiverSigPad.current && !receiverSigPad.current.isEmpty() ? receiverSigPad.current.getTrimmedCanvas().toDataURL('image/png') : null);

      if (!requisition.storeStaffSignatureUrl && storeSigData) {
        await recordStoreFulfill(requisition.id, {
          storeStaffName: handoverStoreStaffName,
          storeStaffSignatureUrl: storeSigData,
          deliveryNote: handoverDeliveryNote,
        });
      }

      const res = await recordSiteHandover(requisition.id, {
        receiverName: handoverReceiverName,
        receiverSignatureUrl: receiverSigData || requisition.receiverSignatureUrl || undefined,
        deliveryPhotos: handoverPhotos,
        deliveryNote: handoverDeliveryNote,
      });

      if (res.success) {
        setRequisition((prev: any) => ({
          ...prev,
          status: 'COMPLETED',
          receiverName: handoverReceiverName,
          receiverSignatureUrl: receiverSigData || prev.receiverSignatureUrl,
          storeStaffName: handoverStoreStaffName || prev.storeStaffName,
          storeStaffSignatureUrl: storeSigData || prev.storeStaffSignatureUrl,
          deliveryPhotos: handoverPhotos,
          deliveryNote: handoverDeliveryNote,
          receivedAt: new Date().toISOString(),
        }));

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
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: res.error || 'ไม่สามารถบันทึกได้' });
      }
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: e.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const statusInfo = getStatusInfo(requisition.status);
  const hasReturnedItems = requisition.status === 'RETURNED' || requisition.status === 'PARTIALLY_RETURNED' ||
    (Array.isArray(requisition.items) && requisition.items.some((it: any) => it.returnedQuantity !== undefined));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8 space-y-6 mt-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>รายละเอียดใบเบิก</span>
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
                <>
                  <Wrench size={12} className="text-slate-600" />
                  <span>เบิกยืมสโตร์ (อุปกรณ์)</span>
                </>
              ) : (
                <>
                  <Building2 size={12} className="text-slate-600" />
                  <span>เบิกของงานโครงการ</span>
                </>
              )}
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">จัดการสถานะการจัดส่งมอบ ตรวจรับหน้างาน และรับคืนอุปกรณ์</p>
        </div>
        <span className={`px-3 py-1 text-xs md:text-sm font-bold rounded-full border ${statusInfo.badge}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Return Request Notification Banner if employee requested return */}
      {(requisition.status === 'RETURN_PENDING' || requisition.returnRequestedAt) && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <RotateCcw size={22} className="animate-spin-slow" />
            </div>
            <div>
              <div className="font-bold text-amber-950 text-sm flex items-center gap-2">
                <span>พนักงานแจ้งขอส่งคืนอุปกรณ์เข้าสโตร์แล้ว</span>
                <span className="text-[11px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  รอเจ้าหน้าที่สโตร์ตรวจรับของ
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-1">
                เวลาที่แจ้ง: {requisition.returnRequestedAt ? new Date(requisition.returnRequestedAt).toLocaleString('th-TH') : '-'}
                {requisition.returnRequestNote && (
                  <span className="block mt-0.5 font-medium text-amber-950">
                    หมายเหตุจากพนักงาน: "{requisition.returnRequestNote}"
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {Array.isArray(requisition.returnRequestPhotos) && requisition.returnRequestPhotos.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-amber-800 font-medium">รูปแนบ:</span>
                <div className="flex -space-x-2">
                  {requisition.returnRequestPhotos.map((img: string, idx: number) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={idx}
                      src={img}
                      alt="Proof"
                      onClick={() => setSelectedPhotoPreview(img)}
                      className="w-8 h-8 rounded-lg object-cover border-2 border-white shadow-sm cursor-pointer hover:scale-110 transition-transform"
                    />
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={openReturnModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              <span>ตรวจรับคืนเดี๋ยวนี้</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs md:text-sm">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-0.5">เลขที่ใบเบิก</p>
          <p className="font-bold text-red-700 font-mono text-sm">{requisition.requisitionNumber}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-0.5">วันที่ทำรายการ</p>
          <p className="font-bold text-gray-900">
            {requisition.date ? new Date(requisition.date).toLocaleDateString('th-TH') : '-'}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-0.5">บริษัท</p>
          <p className="font-bold text-gray-900">{requisition.company || '-'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-0.5">สาขา / คลังสินค้า</p>
          <p className="font-bold text-slate-800">{requisition.branch || 'BKK-HQ'}</p>
        </div>

        {/* Second Row: Adapted for Requisition Type */}
        {requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
          <>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-0.5">วัตถุประสงค์ในการยืม</p>
              <p className="font-bold text-amber-950 truncate" title={requisition.deliveryNote || '-'}>
                {requisition.deliveryNote || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-900 mb-0.5">กำหนดส่งคืนสโตร์</p>
              <p className="font-black text-rose-600">
                {requisition.deliveryDate ? new Date(requisition.deliveryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold text-gray-500 mb-0.5">สถานที่นำไปใช้งาน</p>
              <p className="font-medium text-slate-700 truncate" title={requisition.destinationSite || '-'}>
                {requisition.destinationSite || '-'}
                {requisition.projectName ? ` (โครงการ: ${requisition.projectName})` : ''}
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-0.5">โครงการ / ชื่องานติดตั้ง</p>
              <p className="font-bold text-blue-800 truncate" title={requisition.projectName || '-'}>
                {requisition.projectName || requisition.items?.[0]?.job || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-0.5">วันส่งของหน้างาน</p>
              <p className="font-bold text-blue-700">
                {requisition.deliveryDate ? new Date(requisition.deliveryDate).toLocaleDateString('th-TH') : '-'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold text-gray-500 mb-0.5">สถานที่จัดส่ง / ไซต์งาน</p>
              <p className="font-medium text-slate-700 truncate" title={requisition.destinationSite || '-'}>
                {requisition.destinationSite || '-'}
                {requisition.deliveryNote ? ` • วิธีส่ง: ${requisition.deliveryNote}` : ''}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Return Information Banner if returned */}
      {hasReturnedItems && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-teal-600" />
              <span>ข้อมูลการรับคืนอุปกรณ์เข้าคลังสโตร์</span>
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              requisition.status === 'RETURNED'
                ? 'bg-teal-100 text-teal-800 border-teal-300'
                : 'bg-indigo-100 text-indigo-800 border-indigo-200'
            }`}>
              {requisition.status === 'RETURNED' ? 'คืนครบถ้วน' : 'คืนบางส่วน'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-700 pt-1">
            <div>
              <span className="text-gray-500">วันที่รับคืน:</span>{' '}
              <span className="font-semibold text-gray-900">
                {requisition.items?.find((it: any) => it.returnDate)?.returnDate
                  ? new Date(requisition.items.find((it: any) => it.returnDate).returnDate).toLocaleDateString('th-TH')
                  : '-'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">ผู้ส่งคืน:</span>{' '}
              <span className="font-semibold text-gray-900">
                {requisition.items?.find((it: any) => it.returnerName)?.returnerName || requisition.requester?.fullName || '-'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">เจ้าหน้าที่รับคืน:</span>{' '}
              <span className="font-semibold text-gray-900">
                {requisition.items?.find((it: any) => it.returnReceiver)?.returnReceiver || '-'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-500" />
          <span>รายการเบิก/ยืมวัสดุอุปกรณ์ ({requisition.items?.length || 0} รายการ)</span>
        </h3>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm">
                <th className="px-4 py-3 font-semibold text-gray-700 w-12 text-center">ลำดับ</th>
                <th className="px-4 py-3 font-semibold text-gray-700">
                  {requisition.requisitionType === 'BORROW_EQUIPMENT' ? 'ชื่อเครื่องมือ / อุปกรณ์' : 'รายการวัสดุ / อุปกรณ์'}
                </th>
                {requisition.requisitionType === 'BORROW_EQUIPMENT' && (
                  <th className="px-4 py-3 font-semibold text-gray-700 w-32">รหัส / Serial No.</th>
                )}
                <th className="px-4 py-3 font-semibold text-gray-700 text-right w-24">จำนวน</th>
                <th className="px-4 py-3 font-semibold text-gray-700 w-24">หน่วย</th>
                {requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
                  <th className="px-4 py-3 font-semibold text-gray-700 w-36">สภาพก่อนยืม</th>
                ) : (
                  <th className="px-4 py-3 font-semibold text-gray-700">งานที่ใช้ / Sub-Job</th>
                )}
                <th className="px-4 py-3 font-semibold text-gray-700">สถานะการคืน</th>
                <th className="px-4 py-3 font-semibold text-gray-700">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {Array.isArray(requisition.items) && requisition.items.map((item: any, index: number) => {
                const origQty = Number(item.quantity) || 1;
                const hasRet = item.returnedQuantity !== undefined;
                const retQty = Number(item.returnedQuantity) || 0;

                return (
                  <tr key={index} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.detail}</td>
                    {requisition.requisitionType === 'BORROW_EQUIPMENT' && (
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.assetCode || '-'}</td>
                    )}
                    <td className="px-4 py-3 font-bold text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-gray-700">{item.unit}</td>
                    {requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
                      <td className="px-4 py-3 text-xs text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                          {item.condition || 'ปกติ'}
                        </span>
                      </td>
                    ) : (
                      <td className="px-4 py-3 text-gray-700">{item.job || '-'}</td>
                    )}
                    <td className="px-4 py-3">
                      {hasRet ? (
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
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
                            <div className="text-[11px] text-gray-500">
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
                        <span className="text-xs text-gray-400">ยังไม่บันทึกคืน</span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {item.returnRemark ? (
                        <span className="text-teal-700 font-medium">คืน: {item.returnRemark}</span>
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
      </div>

      {/* 4 Signatures Section (Matching Company Excel Form) */}
      <div className="pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-bold text-gray-900">
            สถานะการลงนาม 4 ฝ่าย (Signatures Status)
          </label>
          <span className="text-xs text-gray-500">
            ผู้ขอเบิก • ผู้อนุมัติ • ผู้เบิก-จ่ายคลัง • ผู้รับของหน้างาน
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Requester */}
          <div className="flex flex-col items-center p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50">
            <span className="text-xs font-bold text-gray-700 mb-2">1. ผู้ขอเบิก</span>
            <div className="w-full h-[75px] flex items-center justify-center bg-white rounded-xl border border-gray-200 p-1">
              {requisition.requesterSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={requisition.requesterSignatureUrl} alt="Requester Signature" className="max-h-full object-contain" />
              ) : (
                <span className="text-gray-400 text-xs">ไม่มีลายเซ็น</span>
              )}
            </div>
            <p className="text-gray-900 font-semibold text-xs mt-2 truncate w-full text-center">
              ({requisition.requester?.fullName || requisition.requesterName || '-'})
            </p>
          </div>

          {/* 2. Approver */}
          <div className="flex flex-col items-center p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50">
            <span className="text-xs font-bold text-gray-700 mb-2">2. ผู้อนุมัติ</span>
            <div className="w-full h-[75px] flex items-center justify-center bg-white rounded-xl border border-gray-200 p-1">
              {requisition.approverSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={requisition.approverSignatureUrl} alt="Approver Signature" className="max-h-full object-contain" />
              ) : (
                <span className="text-gray-400 text-xs">ไม่มีลายเซ็น</span>
              )}
            </div>
            <p className="text-gray-900 font-semibold text-xs mt-2 truncate w-full text-center">
              ({requisition.approver?.fullName || requisition.approverName || '-'})
            </p>
          </div>

          {/* 3. Store Staff */}
          <div className="flex flex-col items-center p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50">
            <span className="text-xs font-bold text-gray-700 mb-2">3. ผู้เบิก-จ่าย (ฝ่ายคลัง)</span>
            <div className="w-full h-[75px] flex items-center justify-center bg-white rounded-xl border border-gray-200 p-1">
              {requisition.storeStaffSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={requisition.storeStaffSignatureUrl} alt="Store Dispenser" className="max-h-full object-contain" />
              ) : (
                <span className="text-amber-600 text-xs font-medium">ยังไม่ลงนามจ่ายของ</span>
              )}
            </div>
            <p className="text-gray-900 font-semibold text-xs mt-2 truncate w-full text-center">
              ({requisition.storeStaffName || 'เจ้าหน้าที่สโตร์'})
            </p>
          </div>

          {/* 4. Receiver */}
          <div className="flex flex-col items-center p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50">
            <span className="text-xs font-bold text-gray-700 mb-2">4. ผู้รับของหน้างาน</span>
            <div className="w-full h-[75px] flex items-center justify-center bg-white rounded-xl border border-gray-200 p-1">
              {requisition.receiverSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={requisition.receiverSignatureUrl} alt="Receiver Signature" className="max-h-full object-contain" />
              ) : (
                <span className="text-rose-600 text-xs font-medium">ยังไม่มีคนเซ็นรับ</span>
              )}
            </div>
            <p className="text-gray-900 font-semibold text-xs mt-2 truncate w-full text-center">
              ({requisition.receiverName || 'ผู้รับของหน้างาน'})
            </p>
          </div>
        </div>
      </div>

      {/* Proof of Delivery Photos Gallery */}
      {Array.isArray(requisition.deliveryPhotos) && requisition.deliveryPhotos.length > 0 && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Camera size={16} className="text-blue-600" />
              <span>หลักฐานรูปถ่ายการส่งมอบของหน้างาน ({requisition.deliveryPhotos.length} รูป)</span>
            </span>
            {requisition.deliveryNote && (
              <span className="text-xs text-slate-500 truncate max-w-xs">
                หมายเหตุ: {requisition.deliveryNote}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {requisition.deliveryPhotos.map((photoUrl: string, pIdx: number) => (
              <div
                key={pIdx}
                onClick={() => setSelectedPhotoPreview(photoUrl)}
                className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all shadow-xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt={`Proof ${pIdx + 1}`} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Eye size={18} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t border-gray-100">
        <Link
          href={`/requisitions/${requisition.id}/pdf`}
          target="_blank"
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl font-bold transition-colors text-sm"
        >
          <Printer size={18} />
          พิมพ์ PDF 4 ลายเซ็น
        </Link>

        {/* Handover & Receive on site */}
        <button
          type="button"
          onClick={openHandoverModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm text-sm"
        >
          <Smartphone size={18} />
          <span>บันทึกตรวจรับของหน้างาน (เซ็นรับ + รูปถ่าย)</span>
        </button>

        {requisition.status === 'APPROVED' && (
          <button
            type="button"
            disabled={loading}
            onClick={handleCompleteClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 text-sm"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
            ส่งมอบเรียบร้อย (ด่วน)
          </button>
        )}

        {(requisition.status === 'COMPLETED' || requisition.status === 'PARTIALLY_RETURNED' || requisition.status === 'RETURN_PENDING') && (
          <button
            type="button"
            onClick={openReturnModal}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm ${
              requisition.status === 'RETURN_PENDING'
                ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                : 'bg-slate-800 text-white hover:bg-slate-900'
            }`}
          >
            <RotateCcw size={18} />
            {requisition.status === 'RETURN_PENDING'
              ? 'ตรวจรับคืนเข้าสโตร์ (พนักงานแจ้งคืนแล้ว)'
              : requisition.status === 'PARTIALLY_RETURNED'
              ? 'บันทึกรับคืนของเพิ่มเติม'
              : 'บันทึกรับคืนของ'}
          </button>
        )}

        {requisition.status === 'RETURNED' && (
          <button
            type="button"
            onClick={openReturnModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl font-bold hover:bg-teal-100 transition-colors shadow-sm text-sm"
          >
            <RotateCcw size={18} className="text-teal-600" />
            ดู / แก้ไขบันทึกการคืนของ
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeComplete}
        title="ยืนยันการจัดส่งมอบของ"
        message="ยืนยันว่าคลังสินค้าได้จัดเตรียมและส่งมอบอุปกรณ์ให้ผู้ขอเบิกเรียบร้อยแล้วใช่หรือไม่?"
        confirmText="ยืนยันส่งมอบ"
        variant="success"
      />

      {/* Return Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => !isSubmittingReturn && setIsReturnModalOpen(false)}
          />

          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-teal-50/60 via-slate-50 to-blue-50/40">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-200">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      บันทึกรับคืนวัสดุและอุปกรณ์เข้าคลัง
                    </h2>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${statusInfo.badge}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    <span>เลขที่ใบเบิก: <strong className="text-slate-700">{requisition.requisitionNumber}</strong></span>
                    <span>•</span>
                    <span>บริษัท: <strong className="text-slate-700">{requisition.company || '-'}</strong></span>
                    <span>•</span>
                    <span>ผู้ขอเบิก: <strong className="text-slate-700">{requisition.requester?.fullName || requisition.requesterName || '-'}</strong></span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => !isSubmittingReturn && setIsReturnModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>วันที่รับคืน *</span>
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    <span>ผู้ส่งคืนอุปกรณ์ *</span>
                  </label>
                  <input
                    type="text"
                    value={returnerName}
                    onChange={e => setReturnerName(e.target.value)}
                    placeholder="ระบุชื่อผู้ส่งคืน"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <PackageCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>เจ้าหน้าที่สโตร์ผู้รับคืน *</span>
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={e => setReceiverName(e.target.value)}
                    placeholder="ระบุชื่อเจ้าหน้าที่รับคืน"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    หมายเหตุภาพรวมการรับคืน (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={returnNote}
                    onChange={e => setReturnNote(e.target.value)}
                    placeholder="เช่น ส่งคืนหลังเสร็จงานติดตั้งไซต์งาน, ตรวจสอบสภาพแล้วใช้งานได้ปกติ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-teal-600" />
                      <span>รายการอุปกรณ์ที่รับคืน ({returnItemsState.length} รายการ)</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      (เลือกแล้ว {returnItemsState.filter(it => it.isSelected).length} รายการ)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReturnItemsState(prev => prev.map(it => ({ ...it, isSelected: true })))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-all"
                    >
                      เลือกทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnItemsState(prev => prev.map(it => ({ ...it, isSelected: true, returnedQuantity: it.quantity })))}
                      className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-[11px] font-semibold transition-all"
                    >
                      คืนเต็มจำนวนทุกชิ้น
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnItemsState(prev => prev.map(it => ({ ...it, isSelected: false })))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition-all"
                    >
                      ล้างการเลือก
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
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
                        {returnItemsState.map(item => {
                          return (
                            <tr
                              key={item.index}
                              className={`transition-colors ${
                                item.isSelected ? 'bg-teal-50/20 hover:bg-teal-50/40' : 'bg-slate-50/40 opacity-60'
                              }`}
                            >
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.isSelected}
                                  onChange={e => {
                                    const checked = e.target.checked;
                                    setReturnItemsState(prev =>
                                      prev.map(it => it.index === item.index ? { ...it, isSelected: checked } : it)
                                    );
                                  }}
                                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-3 text-center text-slate-400 font-mono">
                                {item.index + 1}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900">{item.detail}</div>
                                <div className="text-[11px] text-slate-400">หน่วยนับ: {item.unit}</div>
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
                                    onChange={e => {
                                      const val = Math.max(0, Math.min(item.quantity, Number(e.target.value) || 0));
                                      setReturnItemsState(prev =>
                                        prev.map(it => it.index === item.index ? { ...it, returnedQuantity: val } : it)
                                      );
                                    }}
                                    className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100 disabled:text-slate-400"
                                  />
                                  <span className="text-[11px] text-slate-500">{item.unit}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <select
                                  disabled={!item.isSelected}
                                  value={item.condition}
                                  onChange={e => {
                                    const c = e.target.value;
                                    setReturnItemsState(prev =>
                                      prev.map(it => it.index === item.index ? { ...it, condition: c } : it)
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
                                  onChange={e => {
                                    const r = e.target.value;
                                    setReturnItemsState(prev =>
                                      prev.map(it => it.index === item.index ? { ...it, remark: r } : it)
                                    );
                                  }}
                                  placeholder="หมายเหตุ..."
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Status Preview Banner */}
              {(() => {
                const selectedItems = returnItemsState.filter(it => it.isSelected);
                const allSelected = returnItemsState.length > 0 && returnItemsState.every(it => it.isSelected && it.returnedQuantity >= it.quantity);
                if (selectedItems.length === 0) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>กรุณาติ๊กเลือกรายการที่ต้องการรับคืนอย่างน้อย 1 รายการ</span>
                    </div>
                  );
                }
                if (allSelected) {
                  return (
                    <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span>
                          <strong>คืนอุปกรณ์ครบถ้วนทุกรายการ:</strong> สถานะใบเบิกจะถูกบันทึกเป็น{' '}
                          <span className="font-bold text-teal-700 underline">"คืนของเรียบร้อย" (RETURNED)</span>
                        </span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <span>
                        <strong>คืนอุปกรณ์บางรายการ / บางจำนวน:</strong> สถานะใบเบิกจะถูกบันทึกเป็น{' '}
                        <span className="font-bold text-indigo-700 underline">"คืนบางส่วน" (PARTIALLY_RETURNED)</span>
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSubmittingReturn}
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                disabled={isSubmittingReturn}
                onClick={handleSubmitReturn}
                className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {isSubmittingReturn ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>บันทึกการรับคืนของเข้าสโตร์</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover & Proof of Delivery Modal (Mobile-Friendly Signature & Camera) */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => !isSubmittingHandover && setIsHandoverModalOpen(false)}
          />

          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      บันทึกส่งมอบ & ตรวจรับของหน้างาน
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      POD & Handover
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    <span>เลขที่: <strong className="text-slate-700">{requisition.requisitionNumber}</strong></span>
                    <span>•</span>
                    <span>โครงการ: <strong className="text-slate-700">{requisition.projectName || requisition.destinationSite || '-'}</strong></span>
                    <span>•</span>
                    <span>สาขา: <strong className="text-slate-700">{requisition.branch || 'BKK-HQ'}</strong></span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmittingHandover && setIsHandoverModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-140px)]">
              {/* Notice */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>แก้ปัญหาใบส่งของไม่มีคนเซ็น & เอกสารสูญหาย:</strong>{' '}
                  ผู้รับของหน้างานสามารถเซ็นรับผ่านหน้าจอมือถือได้ทันที พร้อมถ่ายรูปสินค้า/อุปกรณ์ที่ส่งมอบ เพื่อแนบเป็นหลักฐานดิจิทัลอัตโนมัติ
                </div>
              </div>

              {/* 1. ผู้รับของหน้างาน */}
              <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>1. ผู้รับของหน้างาน (Receiver) <span className="text-rose-500">*</span></span>
                </label>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    ชื่อ-นามสกุล ผู้รับของ
                  </label>
                  <input
                    type="text"
                    value={handoverReceiverName}
                    onChange={(e) => setHandoverReceiverName(e.target.value)}
                    placeholder="เช่น สมชาย ใจดี (โฟร์แมน / วิศวกรโครงการ)"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-medium"
                  />
                </div>

                {/* Receiver Signature Canvas */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-600">
                      ลายเซ็นผู้รับของ (เซ็นบนหน้าจอด้วยนิ้ว/ปากกา หรืออัปโหลดไฟล์)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => receiverSigPad.current?.clear()}
                        className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold"
                      >
                        <Eraser size={12} /> ล้างลายเซ็น
                      </button>
                      <label className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold cursor-pointer">
                        <Upload size={12} /> แนบรูปภาพ
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
                    <div className="relative border border-slate-300 bg-white rounded-xl p-2 h-36 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={receiverSigFile} alt="Receiver Signature" className="max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setReceiverSigFile(null)}
                        className="absolute top-2 right-2 p-1 bg-rose-50 text-rose-600 rounded-lg text-xs hover:bg-rose-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="border border-slate-300 bg-white rounded-xl overflow-hidden shadow-inner">
                      <SignatureCanvas
                        ref={receiverSigPad}
                        canvasProps={{
                          className: 'w-full h-36 bg-white cursor-crosshair',
                        }}
                      />
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    * สามารถเซ็นลากนิ้วบนมือถือได้โดยตรง
                  </p>
                </div>
              </div>

              {/* 2. เจ้าหน้าที่สโตร์ผู้จ่ายของ (ถ้ายังไม่มีการเซ็นจ่าย) */}
              {!requisition.storeStaffSignatureUrl && (
                <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
                  <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-600" />
                    <span>2. เจ้าหน้าที่สโตร์ / ผู้เบิก-จ่าย ฝ่ายคลัง</span>
                  </label>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      ชื่อผู้เบิก-จ่าย
                    </label>
                    <input
                      type="text"
                      value={handoverStoreStaffName}
                      onChange={(e) => setHandoverStoreStaffName(e.target.value)}
                      placeholder="ชื่อเจ้าหน้าที่สโตร์"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-600">
                        ลายเซ็นผู้จ่ายของ
                      </label>
                      <button
                        type="button"
                        onClick={() => storeSigPad.current?.clear()}
                        className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold"
                      >
                        <Eraser size={12} /> ล้างลายเซ็น
                      </button>
                    </div>
                    {storeStaffSigFile ? (
                      <div className="relative border border-slate-300 bg-white rounded-xl p-2 h-32 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={storeStaffSigFile} alt="Store Staff Signature" className="max-h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setStoreStaffSigFile(null)}
                          className="absolute top-2 right-2 p-1 bg-rose-50 text-rose-600 rounded-lg text-xs hover:bg-rose-100"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="border border-slate-300 bg-white rounded-xl overflow-hidden shadow-inner">
                        <SignatureCanvas
                          ref={storeSigPad}
                          canvasProps={{
                            className: 'w-full h-32 bg-white cursor-crosshair',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. รูปถ่ายการส่งมอบของหน้างาน (Proof of Delivery Photos) */}
              <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>3. รูปถ่ายการส่งมอบของหน้างาน (Proof Photos)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-xs transition-colors">
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
                <p className="text-xs text-slate-500">
                  ถ่ายรูปกองวัสดุอุปกรณ์, รถขนส่ง, หรือการรับมอบ ณ ไซต์งาน เพื่อเก็บเป็นหลักฐานในระบบถาวร (ไม่มีวันหาย)
                </p>

                {handoverPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                    {handoverPhotos.map((photoUrl, pIdx) => (
                      <div
                        key={pIdx}
                        className="group relative aspect-video rounded-xl overflow-hidden border border-slate-300 bg-black/5"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoUrl} alt={`Photo ${pIdx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(pIdx)}
                          className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg opacity-90 transition-opacity shadow-sm"
                          title="ลบรูปนี้"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-300 bg-white cursor-pointer transition-colors">
                    <Camera size={32} className="mb-2 text-slate-400" />
                    <span className="text-xs font-semibold">แตะเพื่อถ่ายรูปด้วยกล้องมือถือ หรือเลือกรูปจากเครื่อง</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 8MB</span>
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

              {/* 4. หมายเหตุ / ข้อความเพิ่มเติม */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  หมายเหตุการส่งมอบ / สถานที่รับของ
                </label>
                <textarea
                  rows={2}
                  value={handoverDeliveryNote}
                  onChange={(e) => setHandoverDeliveryNote(e.target.value)}
                  placeholder="เช่น ส่งมอบครบถ้วนที่หน้างานไซน์ Zone C ชั้น 2, มีสายไฟม้วนใหญ่ 1 ม้วน..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-medium"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSubmittingHandover}
                onClick={() => setIsHandoverModalOpen(false)}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                disabled={isSubmittingHandover}
                onClick={handleSubmitHandover}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {isSubmittingHandover ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>บันทึกตรวจรับของหน้างาน & บันทึกเสร็จสมบูรณ์</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Lightbox */}
      {selectedPhotoPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedPhotoPreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-transparent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhotoPreview}
              alt="Proof Preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setSelectedPhotoPreview(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
