"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateRequisitionStatus, returnMaterialRequisition } from '@/app/actions/requisitions';
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
} from 'lucide-react';
import ConfirmModal from '@/app/components/ConfirmModal';
import Link from 'next/link';
import Swal from 'sweetalert2';

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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'รอจัดของ / ส่งมอบ', badge: 'bg-amber-100 text-amber-800 border-amber-200' };
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
    setReturnNote('');
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

  const statusInfo = getStatusInfo(requisition.status);
  const hasReturnedItems = requisition.status === 'RETURNED' || requisition.status === 'PARTIALLY_RETURNED' ||
    (Array.isArray(requisition.items) && requisition.items.some((it: any) => it.returnedQuantity !== undefined));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8 mt-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">รายละเอียดใบเบิก/ยืมของ</h2>
          <p className="text-xs text-gray-500 mt-0.5">จัดการสถานะการจัดส่งมอบและรับคืนอุปกรณ์</p>
        </div>
        <span className={`px-3 py-1 text-sm font-bold rounded-full border ${statusInfo.badge}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-1">เลขที่ใบเบิก</p>
          <p className="font-bold text-gray-900">{requisition.requisitionNumber}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-1">วันที่</p>
          <p className="font-bold text-gray-900">
            {requisition.date ? new Date(requisition.date).toLocaleDateString('th-TH') : '-'}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-1">บริษัท</p>
          <p className="font-bold text-gray-900">{requisition.company || '-'}</p>
        </div>
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
                <th className="px-4 py-3 font-semibold text-gray-700">รายละเอียด</th>
                <th className="px-4 py-3 font-semibold text-gray-700 text-right">จำนวนเบิก</th>
                <th className="px-4 py-3 font-semibold text-gray-700">หน่วย</th>
                <th className="px-4 py-3 font-semibold text-gray-700">งานที่ใช้</th>
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
                    <td className="px-4 py-3 font-bold text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-gray-700">{item.unit}</td>
                    <td className="px-4 py-3 text-gray-700">{item.job || '-'}</td>
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

      <div className="flex flex-col md:flex-row gap-8 justify-around pt-6 border-t border-gray-100">
        <div className="flex flex-col items-center">
          <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">ผู้ขอเบิก</label>
          <div className="w-[200px] h-[80px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
            {requisition.requesterSignatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={requisition.requesterSignatureUrl} alt="Requester Signature" className="max-h-[70px] object-contain" />
            ) : (
              <span className="text-gray-400 text-xs">ไม่มีลายเซ็น</span>
            )}
          </div>
          <p className="text-gray-900 font-medium mt-3">({requisition.requester?.fullName || requisition.requesterName || '-'})</p>
        </div>

        <div className="flex flex-col items-center">
          <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">ผู้อนุมัติ</label>
          <div className="w-[200px] h-[80px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
            {requisition.approverSignatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={requisition.approverSignatureUrl} alt="Approver Signature" className="max-h-[70px] object-contain" />
            ) : (
              <span className="text-gray-400 text-xs">ไม่มีลายเซ็น</span>
            )}
          </div>
          <p className="text-gray-900 font-medium mt-3">({requisition.approver?.fullName || requisition.approverName || '-'})</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t border-gray-100">
        <Link
          href={`/requisitions/${requisition.id}/pdf`}
          target="_blank"
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl font-bold transition-colors text-sm"
        >
          <Printer size={18} />
          พิมพ์ PDF
        </Link>

        {requisition.status === 'APPROVED' && (
          <button
            type="button"
            disabled={loading}
            onClick={handleCompleteClick}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 text-sm"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
            ส่งมอบของเรียบร้อย
          </button>
        )}

        {(requisition.status === 'COMPLETED' || requisition.status === 'PARTIALLY_RETURNED') && (
          <button
            type="button"
            onClick={openReturnModal}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm text-sm"
          >
            <RotateCcw size={18} />
            {requisition.status === 'PARTIALLY_RETURNED' ? 'บันทึกรับคืนของเพิ่มเติม' : 'บันทึกรับคืนของ'}
          </button>
        )}

        {requisition.status === 'RETURNED' && (
          <button
            type="button"
            onClick={openReturnModal}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl font-bold hover:bg-teal-100 transition-colors shadow-sm text-sm"
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
    </div>
  );
}
