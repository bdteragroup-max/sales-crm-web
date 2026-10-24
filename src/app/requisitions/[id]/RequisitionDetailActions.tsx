"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Printer, RotateCcw, Clock } from 'lucide-react';
import ReturnRequestModal from '../components/ReturnRequestModal';

interface Props {
  requisition: any;
  currentUserId: string;
}

export default function RequisitionDetailActions({ requisition, currentUserId }: Props) {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const isRequester = requisition.requesterId === currentUserId;
  const canRequestReturn =
    isRequester &&
    (requisition.status === 'COMPLETED' ||
     requisition.status === 'PARTIALLY_RETURNED' ||
     requisition.status === 'DISPATCHED' ||
     requisition.status === 'RETURN_PENDING');

  const isPendingReturn = requisition.status === 'RETURN_PENDING';

  return (
    <div className="flex items-center gap-3">
      {canRequestReturn && (
        <button
          onClick={() => setIsReturnModalOpen(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all ${
            isPendingReturn
              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
          }`}
        >
          {isPendingReturn ? (
            <>
              <Clock size={16} className="text-amber-700 animate-pulse" />
              <span>แจ้งคืนแล้ว (แก้ไข/ส่งซ้ำ)</span>
            </>
          ) : (
            <>
              <RotateCcw size={16} />
              <span>แจ้งส่งคืนสโตร์</span>
            </>
          )}
        </button>
      )}

      <Link
        href={`/requisitions/${requisition.id}/pdf`}
        target="_blank"
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl font-bold text-sm transition-colors"
      >
        <Printer size={18} />
        พิมพ์ PDF
      </Link>

      <ReturnRequestModal
        requisition={requisition}
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
      />
    </div>
  );
}
