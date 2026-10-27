"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Printer, RotateCcw, Clock, Smartphone, CheckCircle2 } from 'lucide-react';
import ReturnRequestModal from '../components/ReturnRequestModal';
import SiteHandoverModal from '../components/SiteHandoverModal';

interface Props {
  requisition: any;
  currentUserId: string;
}

export default function RequisitionDetailActions({ requisition, currentUserId }: Props) {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  const isRequester = requisition.requesterId === currentUserId;
  const canRequestReturn =
    isRequester &&
    (requisition.status === 'COMPLETED' ||
     requisition.status === 'PARTIALLY_RETURNED' ||
     requisition.status === 'DISPATCHED' ||
     requisition.status === 'RETURN_PENDING');

  const isPendingReturn = requisition.status === 'RETURN_PENDING';

  // Can sign handover if approved, dispatched, dispensed or completed
  const canSignHandover =
    requisition.status === 'APPROVED' ||
    requisition.status === 'DISPATCHED' ||
    requisition.status === 'DISPENSED' ||
    requisition.status === 'COMPLETED';

  const hasSignedReceiver = Boolean(requisition.receiverSignatureUrl);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Handover & Receive on site button */}
      {canSignHandover && (
        <button
          type="button"
          onClick={() => setIsHandoverModalOpen(true)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all ${
            hasSignedReceiver
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
          }`}
          title="ลงนามตรวจรับสินค้าหน้างานโครงการ และถ่ายรูปหลักฐาน"
        >
          {hasSignedReceiver ? (
            <>
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>ตรวจรับหน้างานแล้ว (ดู/แก้ไข)</span>
            </>
          ) : (
            <>
              <Smartphone size={16} />
              <span>เซ็นรับสินค้าหน้างาน</span>
            </>
          )}
        </button>
      )}

      {canRequestReturn && (
        <button
          onClick={() => setIsReturnModalOpen(true)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all ${
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
        className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl font-bold text-xs sm:text-sm transition-colors"
      >
        <Printer size={16} />
        พิมพ์ PDF
      </Link>

      {/* Return Request Modal */}
      <ReturnRequestModal
        requisition={requisition}
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
      />

      {/* Site Handover Modal */}
      <SiteHandoverModal
        requisition={requisition}
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
      />
    </div>
  );
}
