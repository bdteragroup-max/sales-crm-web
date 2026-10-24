"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Edit, Trash2, CheckCircle, Loader2, Printer, RotateCcw } from 'lucide-react';
import { deleteMaterialRequisition } from '@/app/actions/requisitions';
import ConfirmModal from '@/app/components/ConfirmModal';
import ReturnRequestModal from './components/ReturnRequestModal';

interface Props {
  req: any;
  currentUserId: string;
}

export default function RequisitionListActions({ req, currentUserId }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const isPending = req.status === 'PENDING_APPROVAL';
  const isRequester = req.requesterId === currentUserId;
  const isApprover = req.approverId === currentUserId;

  const isBorrowType = req.requisitionType === 'BORROW_EQUIPMENT';

  const canRequestReturn =
    isRequester &&
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

      <Link 
        href={`/requisitions/${req.id}/pdf`}
        target="_blank"
        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200/70 hover:border-red-200 rounded-xl transition-all shadow-xs"
        title="พิมพ์ PDF ใบเบิก"
      >
        <Printer size={15} />
      </Link>
      
      <Link 
        href={`/requisitions/${req.id}`}
        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70 rounded-xl transition-all shadow-xs"
        title="ดูรายละเอียดใบเบิก"
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
    </div>
  );
}
