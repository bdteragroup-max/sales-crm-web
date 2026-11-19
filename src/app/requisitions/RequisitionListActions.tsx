"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Edit, Trash2, CheckCircle, Loader2, Printer, RotateCcw, ListChecks, Truck, FileCheck2 } from 'lucide-react';
import { deleteMaterialRequisition } from '@/app/actions/requisitions';
import ConfirmModal from '@/app/components/ConfirmModal';
import ReturnRequestModal from './components/ReturnRequestModal';
import RequisitionTransportSignModal from './components/RequisitionTransportSignModal';
import RequisitionAccountingSignModal from './components/RequisitionAccountingSignModal';

interface Props {
  req: any;
  currentUserId: string;
  currentUserFullName?: string;
  canSignAccounting?: boolean;
  canSignTransport?: boolean;
  isAccountingUser?: boolean;
  isTransportUser?: boolean;
  savedAccountingSignatureUrl?: string | null;
  savedTransportSignatureUrl?: string | null;
}

export default function RequisitionListActions({
  req,
  currentUserId,
  currentUserFullName = '',
  canSignAccounting = false,
  canSignTransport = true,
  isAccountingUser = false,
  isTransportUser = false,
  savedAccountingSignatureUrl = null,
  savedTransportSignatureUrl = null,
}: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isTransportModalOpen, setIsTransportModalOpen] = useState(false);
  const [isAccountingModalOpen, setIsAccountingModalOpen] = useState(false);

  const isPending = req.status === 'PENDING_APPROVAL';
  const isRejected = req.status === 'REJECTED';
  const isRequester = req.requesterId === currentUserId;
  const isApprover = req.approverId === currentUserId;

  const isBorrowType = req.requisitionType === 'BORROW_EQUIPMENT';
  const isNonReturnable = req.requisitionType === 'CLAIM' || req.requisitionType === 'PROJECT';

  const canRequestReturn =
    isRequester &&
    !isNonReturnable &&
    (isBorrowType || req.status === 'PARTIALLY_RETURNED' || req.status === 'RETURN_PENDING') &&
    (req.status === 'COMPLETED' ||
     req.status === 'PARTIALLY_RETURNED' ||
     req.status === 'DISPATCHED' ||
     req.status === 'RETURN_PENDING');

  const isPendingReturn = req.status === 'RETURN_PENDING';

  const handleDeleteClick = () => {
    setIsConfirmOpen(true);
  };

  const executeDelete = async () => {
    setIsConfirmOpen(false);
    setIsDeleting(true);
    const res = await deleteMaterialRequisition(req.id);
    if (res.success) {
      router.refresh();
    } else {
      alert("เกิดข้อผิดพลาด: " + res.error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      {canRequestReturn && (
        <button
          onClick={() => setIsReturnModalOpen(true)}
          className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold border ${
            isPendingReturn
              ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-xs'
              : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 shadow-xs'
          }`}
          title={isPendingReturn ? "แจ้งส่งคืนแล้ว (รอสโตร์ตรวจรับ)" : "แจ้งส่งคืนสโตร์"}
        >
          <RotateCcw size={14} className={isPendingReturn ? 'text-amber-700' : 'text-teal-600'} />
          <span>{isPendingReturn ? 'รอตรวจรับ' : 'แจ้งคืน'}</span>
        </button>
      )}

      {canSignTransport && !isPending && !isRejected && (
        <button
          type="button"
          onClick={() => setIsTransportModalOpen(true)}
          className={`p-2 rounded-xl border transition-all shadow-xs ${
            req.transportSignatureUrl
              ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
              : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'
          }`}
          title={req.transportSignatureUrl ? 'ขนส่งเซ็นรับสินค้าแล้ว (แก้ไข)' : 'ขนส่ง / ขนส่งนอกเซ็นรับสินค้า'}
        >
          <Truck size={15} />
        </button>
      )}

      {canSignAccounting && !isPending && !isRejected && (
        <button
          type="button"
          onClick={() => setIsAccountingModalOpen(true)}
          className={`p-2 rounded-xl border transition-all shadow-xs ${
            req.accountingSignatureUrl
              ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
              : 'bg-white text-violet-600 border-violet-200 hover:bg-violet-50'
          }`}
          title={req.accountingSignatureUrl ? 'แผนกบัญชีรับทราบแล้ว (แก้ไข)' : 'แผนกบัญชีเซ็นรับทราบปล่อยของ'}
        >
          <FileCheck2 size={15} />
        </button>
      )}

      <Link 
        href={`/requisitions/${req.id}/pdf`}
        target="_blank"
        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200/70 hover:border-red-200 rounded-xl transition-all shadow-xs"
        title="พิมพ์ PDF ใบเบิก"
      >
        <Printer size={15} />
      </Link>
      
      {isRequester && !isPending && req.status !== 'RETURNED' && req.status !== 'REJECTED' && (
        <Link
          href={`/requisitions/${req.id}#items-editor`}
          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl transition-all flex items-center gap-1 text-xs font-bold shadow-xs"
          title="ติ๊กเช็คของที่ใช้จริง หรือเพิ่มสินค้าเพิ่มเติม (ดำเนินการได้แม้หัวหน้าเซ็นอนุมัติแล้ว)"
        >
          <ListChecks size={14} />
          <span>เช็ค/เพิ่มของ</span>
        </Link>
      )}

      <Link 
        href={`/requisitions/${req.id}`}
        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70 rounded-xl transition-all shadow-xs"
        title="ดูรายละเอียดใบเบิก / ติ๊กเช็คของและเพิ่มสินค้า"
      >
        <Eye size={15} />
      </Link>

      {isPending && isRequester && (
        <>
          <Link 
            href={`/requisitions/${req.id}/edit`}
            className="p-2 text-blue-600 hover:bg-blue-50 border border-blue-200/80 rounded-xl transition-all shadow-xs"
            title="แก้ไขใบเบิก"
          >
            <Edit size={15} />
          </Link>
          <button 
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200/80 rounded-xl transition-all disabled:opacity-50 shadow-xs"
            title="ยกเลิก/ลบใบเบิก"
          >
            {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>
        </>
      )}

      {isPending && isApprover && (
        <Link 
          href={`/requisitions/${req.id}/approve`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-red-600/20 transition-all hover:scale-[1.02]"
        >
          <CheckCircle size={14} />
          <span>อนุมัติ</span>
        </Link>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="ยืนยันการยกเลิก/ลบ"
        message="คุณแน่ใจหรือไม่ว่าต้องการยกเลิกและลบใบเบิก/ยืมนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
        confirmText="ยืนยันการลบ"
        variant="danger"
      />

      <ReturnRequestModal
        requisition={req}
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
      />

      <RequisitionTransportSignModal
        requisition={req}
        isOpen={isTransportModalOpen}
        onClose={() => setIsTransportModalOpen(false)}
        currentUserName={currentUserFullName}
        isTransportUser={isTransportUser}
        savedTransportSignatureUrl={savedTransportSignatureUrl}
      />

      <RequisitionAccountingSignModal
        requisition={req}
        isOpen={isAccountingModalOpen}
        onClose={() => setIsAccountingModalOpen(false)}
        currentUserName={currentUserFullName}
        isAccountingUser={isAccountingUser}
        savedAccountingSignatureUrl={savedAccountingSignatureUrl}
      />
    </div>
  );
}
