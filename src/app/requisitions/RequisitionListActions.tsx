"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Edit, Trash2, CheckCircle, Loader2, Printer } from 'lucide-react';
import { deleteMaterialRequisition } from '@/app/actions/requisitions';
import ConfirmModal from '@/app/components/ConfirmModal';

interface Props {
  req: any;
  currentUserId: string;
}

export default function RequisitionListActions({ req, currentUserId }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const isPending = req.status === 'PENDING_APPROVAL';
  const isRequester = req.requesterId === currentUserId;
  const isApprover = req.approverId === currentUserId;

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
    <div className="flex items-center justify-end gap-2">
      <Link 
        href={`/requisitions/${req.id}/pdf`}
        target="_blank"
        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="พิมพ์ PDF"
      >
        <Printer size={18} />
      </Link>
      
      <Link 
        href={`/requisitions/${req.id}`}
        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="ดูรายละเอียด"
      >
        <Eye size={18} />
      </Link>

      {isPending && isRequester && (
        <>
          <Link 
            href={`/requisitions/${req.id}/edit`}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="แก้ไข"
          >
            <Edit size={18} />
          </Link>
          <button 
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="ยกเลิก/ลบ"
          >
            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          </button>
        </>
      )}

      {isPending && isApprover && (
        <Link 
          href={`/requisitions/${req.id}/approve`}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors"
        >
          <CheckCircle size={16} />
          อนุมัติ
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
    </div>
  );
}
