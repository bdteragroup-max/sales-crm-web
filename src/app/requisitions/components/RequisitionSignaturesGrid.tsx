'use client';

import React from 'react';
import { FileSignature, PenLine } from 'lucide-react';
import {
  formatTransportRoleSubtitle,
  normalizeRequisitionTransportType,
} from '@/app/lib/requisitionUtils';
import type { RequisitionSignatureRecord } from './signaturePadHelper';

interface SignatureBoxDef {
  step: string;
  sigUrl?: string | null;
  name: string;
  subLabel?: string | null;
  subBadgeClass?: string;
  emptyText: string;
  emptyClass: string;
  canClick?: boolean;
  clickLabel?: string;
  onClick?: () => void;
}

interface RequisitionSignaturesGridProps {
  requisition: RequisitionSignatureRecord;
  requesterDisplay?: string;
  pulledStoreSigUrl?: string | null;
  pulledStoreName?: string | null;
  canSignStore?: boolean;
  canSignAccounting?: boolean;
  canSignTransport?: boolean;
  canSignReceiver?: boolean;
  onClickStoreSign?: () => void;
  onClickAccountingSign?: () => void;
  onClickTransportSign?: () => void;
  onClickReceiverSign?: () => void;
  compact?: boolean;
}

export default function RequisitionSignaturesGrid({
  requisition,
  requesterDisplay,
  pulledStoreSigUrl = null,
  pulledStoreName = null,
  canSignStore = false,
  canSignAccounting = false,
  canSignTransport = false,
  canSignReceiver = false,
  onClickStoreSign,
  onClickAccountingSign,
  onClickTransportSign,
  onClickReceiverSign,
  compact = false,
}: RequisitionSignaturesGridProps) {
  const isApprovedOrLater =
    requisition.status !== 'PENDING_APPROVAL' && requisition.status !== 'REJECTED';

  const resolvedRequesterName =
    requesterDisplay ||
    requisition.requester?.fullName ||
    requisition.requesterName ||
    '-';

  const transportSigned = Boolean(requisition.transportSignatureUrl);
  const transportMode = normalizeRequisitionTransportType(requisition.transportType);
  const transportSub = transportSigned
    ? formatTransportRoleSubtitle(requisition.transportType, requisition.transportCompany)
    : null;

  const boxes: SignatureBoxDef[] = [
    {
      step: '1. ผู้ขอเบิก',
      sigUrl: requisition.requesterSignatureUrl,
      name: resolvedRequesterName,
      emptyText: 'ไม่มีลายเซ็น',
      emptyClass: 'text-slate-400',
    },
    {
      step: '2. ผู้อนุมัติ',
      sigUrl: requisition.approverSignatureUrl,
      name: requisition.approver?.fullName || requisition.approverName || '-',
      emptyText: 'รออนุมัติ',
      emptyClass: 'text-slate-400',
    },
    {
      step: '3. ผู้จ่ายของ (คลัง)',
      sigUrl: requisition.storeStaffSignatureUrl || pulledStoreSigUrl,
      name:
        requisition.storeStaffName ||
        pulledStoreName ||
        'เจ้าหน้าที่สโตร์',
      subLabel: requisition.storeStaffSignatureUrl ? 'สโตร์ลงนามจ่ายแล้ว' : null,
      subBadgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      emptyText: 'ยังไม่ลงนามจ่าย',
      emptyClass: 'text-amber-600',
      canClick: Boolean(isApprovedOrLater && canSignStore && onClickStoreSign),
      clickLabel: requisition.storeStaffSignatureUrl ? 'แก้ไขลายเซ็น' : 'เซ็นจ่ายของ',
      onClick: onClickStoreSign,
    },
    {
      step: '4. แผนกบัญชี (รับทราบ)',
      sigUrl: requisition.accountingSignatureUrl,
      name: requisition.accountingName || 'เจ้าหน้าที่แผนกบัญชี',
      subLabel: requisition.accountingSignatureUrl ? 'รับทราบปล่อยของแล้ว' : null,
      subBadgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
      emptyText: 'รอเซ็นรับทราบปล่อยของ',
      emptyClass: 'text-violet-600',
      canClick: Boolean(isApprovedOrLater && canSignAccounting && onClickAccountingSign),
      clickLabel: requisition.accountingSignatureUrl ? 'แก้ไขลายเซ็น' : 'เซ็นรับทราบ',
      onClick: onClickAccountingSign,
    },
    {
      step: '5. ขนส่ง / ขนส่งนอก',
      sigUrl: requisition.transportSignatureUrl,
      name: requisition.transportName || 'ผู้เข้ารับสินค้า (ขนส่ง)',
      subLabel: transportSub,
      subBadgeClass:
        transportMode === 'EXTERNAL'
          ? 'bg-orange-50 text-orange-700 border-orange-200'
          : 'bg-blue-50 text-blue-700 border-blue-200',
      emptyText: 'รอขนส่งเซ็นรับสินค้า',
      emptyClass: 'text-orange-600',
      canClick: Boolean(isApprovedOrLater && canSignTransport && onClickTransportSign),
      clickLabel: requisition.transportSignatureUrl ? 'แก้ไขลายเซ็น' : 'เซ็นรับสินค้า',
      onClick: onClickTransportSign,
    },
    {
      step: '6. ผู้รับหน้างาน',
      sigUrl: requisition.receiverSignatureUrl,
      name: requisition.receiverName || 'ผู้รับของหน้างาน',
      emptyText: 'ยังไม่เซ็นรับ',
      emptyClass: 'text-rose-600',
      canClick: Boolean(isApprovedOrLater && canSignReceiver && onClickReceiverSign),
      clickLabel: requisition.receiverSignatureUrl ? 'ดู/แก้ไข' : 'เซ็นรับหน้างาน',
      onClick: onClickReceiverSign,
    },
  ];

  return (
    <section
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 ${
        compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-6'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-blue-600 shrink-0" />
          <span>สถานะการลงนาม 6 ฝ่าย</span>
        </h3>
        <span className="text-[11px] text-slate-400 font-medium">
          ผู้ขอเบิก • ผู้อนุมัติ • คลัง • แผนกบัญชี • ขนส่ง/ขนส่งนอก • ผู้รับหน้างาน
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {boxes.map((box) => (
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

            <div className="w-full h-[76px] flex items-center justify-center bg-white rounded-xl border border-slate-200/90 p-1.5 relative">
              {box.sigUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={box.sigUrl}
                  alt={box.step}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className={`text-[11px] font-semibold text-center ${box.emptyClass}`}>
                  {box.emptyText}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-col items-center gap-1 min-h-[34px]">
              <p className="text-[11px] font-bold text-slate-800 text-center truncate w-full">
                ({box.name})
              </p>

              {box.subLabel && (
                <span
                  className={`inline-block max-w-full truncate px-2 py-0.5 rounded-full text-[10px] font-bold border ${box.subBadgeClass || 'bg-slate-100 text-slate-600 border-slate-200'}`}
                  title={box.subLabel}
                >
                  {box.subLabel}
                </span>
              )}

              {box.canClick && box.onClick && (
                <button
                  type="button"
                  onClick={box.onClick}
                  className="mt-0.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  <PenLine size={11} />
                  <span>{box.clickLabel}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
