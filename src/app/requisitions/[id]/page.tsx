import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { getRequisitionById } from '@/app/actions/requisitions';
import { isSuperUser, canViewAll } from '@/app/lib/roleHelper';
import {
  isStoreOrPurchasingRole,
  isTransportRole,
  isAccountingRequisitionRole,
  canViewAllRequisitionsRole,
} from '@/app/lib/requisitionUtils';
import { Package, Clock, Image as ImageIcon, Wrench, Building2, CheckCircle2, RotateCcw, Truck, XCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import RequisitionDetailActions from './RequisitionDetailActions';
import RequisitionItemsInteractiveSection from '../components/RequisitionItemsInteractiveSection';
import RequisitionDetailSignaturesSection from '../components/RequisitionDetailSignaturesSection';

export const metadata = {
  title: 'รายละเอียดใบเบิก/ยืมของ - TeraSales',
};

export default async function RequisitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUser();
  if (!session) return <div>Unauthorized</div>;

  const res = await getRequisitionById(id);
  const requisition = res.success ? res.data : null;

  if (!requisition) {
    return <div className="p-8 text-center text-gray-500">ไม่พบคำขอใบเบิก/ยืมของ</div>;
  }

  // Authorization: Requester, Approver, Super Admin, Executive, Store, Purchasing, Transport, or Accounting staff
  const isSuper = isSuperUser(session.role) || canViewAll(session.role);
  const isStoreOrPurchasing = isStoreOrPurchasingRole(session.role);
  const isTransportUser = isTransportRole(session.role);
  const isAccountingUser = isAccountingRequisitionRole(session.role);
  const canViewAllReqs = canViewAllRequisitionsRole(session.role);

  if (
    !isSuper &&
    !canViewAllReqs &&
    requisition.requesterId !== session.id &&
    requisition.approverId !== session.id
  ) {
    return <div className="p-8 text-center text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  const canSignStore = isSuperUser(session.role) || isStoreOrPurchasing;
  const canSignAccounting = isAccountingUser;
  const canSignTransport =
    !isAccountingUser &&
    (isSuper ||
      isStoreOrPurchasing ||
      isTransportUser ||
      requisition.requesterId === session.id ||
      requisition.approverId === session.id);

  const latestSigRecord = await prisma.materialRequisition.findFirst({
    where: {
      OR: [
        { accountingId: session.id, accountingSignatureUrl: { not: null } },
        { transportId: session.id, transportSignatureUrl: { not: null } },
        { storeStaffId: session.id, storeStaffSignatureUrl: { not: null } },
        { approverId: session.id, approverSignatureUrl: { not: null } },
        { requesterId: session.id, requesterSignatureUrl: { not: null } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      accountingId: true,
      accountingSignatureUrl: true,
      transportId: true,
      transportSignatureUrl: true,
      storeStaffId: true,
      storeStaffSignatureUrl: true,
      approverId: true,
      approverSignatureUrl: true,
      requesterId: true,
      requesterSignatureUrl: true,
    },
  });

  const fallbackUserSig = latestSigRecord
    ? (latestSigRecord.accountingId === session.id && latestSigRecord.accountingSignatureUrl) ||
    (latestSigRecord.transportId === session.id && latestSigRecord.transportSignatureUrl) ||
    (latestSigRecord.storeStaffId === session.id && latestSigRecord.storeStaffSignatureUrl) ||
    (latestSigRecord.approverId === session.id && latestSigRecord.approverSignatureUrl) ||
    (latestSigRecord.requesterId === session.id && latestSigRecord.requesterSignatureUrl) ||
    null
    : null;

  const savedStoreSignatureUrl =
    (latestSigRecord?.storeStaffId === session.id && latestSigRecord.storeStaffSignatureUrl) ||
    fallbackUserSig;
  const savedAccountingSignatureUrl =
    (latestSigRecord?.accountingId === session.id && latestSigRecord.accountingSignatureUrl) ||
    fallbackUserSig;
  const savedTransportSignatureUrl =
    (latestSigRecord?.transportId === session.id && latestSigRecord.transportSignatureUrl) ||
    fallbackUserSig;

  const canEditItems =
    (isSuper ||
      isStoreOrPurchasing ||
      requisition.requesterId === session.id ||
      requisition.approverId === session.id) &&
    requisition.status !== 'RETURNED' &&
    requisition.status !== 'REJECTED';

  const serializedRequisition = JSON.parse(JSON.stringify(requisition));

  const returnPhotos = Array.isArray(requisition.returnRequestPhotos) ? requisition.returnRequestPhotos : [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/requisitions"
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
          >
            &larr;
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Package className="text-red-600" />
              รายละเอียดใบเบิก/ยืมวัสดุอุปกรณ์
            </h1>
            <p className="text-gray-500 mt-1">ข้อมูลการขอเบิก/ยืมวัสดุอุปกรณ์ของคุณ</p>
          </div>
        </div>

        <RequisitionDetailActions
          requisition={serializedRequisition}
          currentUserId={session.id}
          currentUserName={session.fullName || ''}
          canSignStore={canSignStore}
          canSignAccounting={canSignAccounting}
          canSignTransport={canSignTransport}
          isAccountingUser={isAccountingUser}
          isTransportUser={isTransportUser}
          savedStoreSignatureUrl={savedStoreSignatureUrl}
          savedAccountingSignatureUrl={savedAccountingSignatureUrl}
          savedTransportSignatureUrl={savedTransportSignatureUrl}
        />
      </div>

      {/* Return Request Notification Banner if pending */}
      {(requisition.status === 'RETURN_PENDING' || requisition.returnRequestedAt) && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
              <Clock size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
                <span>แจ้งขอส่งคืนอุปกรณ์เข้าสโตร์แล้ว</span>
                <span className="text-[11px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
                  รอเจ้าหน้าที่สโตร์ตรวจรับของ
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5">
                เวลาที่แจ้ง: {requisition.returnRequestedAt ? new Date(requisition.returnRequestedAt).toLocaleString('th-TH') : '-'}
                {requisition.returnRequestNote && (
                  <span className="block mt-1 font-medium text-amber-950">
                    หมายเหตุ: &ldquo;{requisition.returnRequestNote}&rdquo;
                  </span>
                )}
              </p>
            </div>
          </div>

          {returnPhotos.length > 0 && (
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              <span className="text-xs text-amber-700 font-medium flex items-center gap-1 mr-1">
                <ImageIcon size={14} /> รูปถ่ายแนบ ({returnPhotos.length}):
              </span>
              <div className="flex -space-x-2">
                {returnPhotos.map((img: unknown, idx: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={idx}
                    src={typeof img === 'string' ? img : String(img)}
                    alt="Return Tool"
                    className="w-8 h-8 rounded-lg object-cover border-2 border-white shadow-sm"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">รายละเอียดใบเบิก/ยืมของ</h2>
            {requisition.requisitionType === 'CLAIM' ? (
              <span className="px-2.5 py-1 bg-violet-50 text-violet-800 text-xs rounded-lg border border-violet-200 font-semibold flex items-center gap-1.5">
                <ShieldCheck size={13} />
                <span>เบิกเคลมสินค้า (ไม่มีการคืนสินค้า)</span>
              </span>
            ) : requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200 font-semibold flex items-center gap-1.5">
                <Wrench size={13} />
                <span>เบิกยืมสโตร์ (อุปกรณ์)</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-200 font-semibold flex items-center gap-1.5">
                <Building2 size={13} />
                <span>เบิกของงานโครงการ</span>
              </span>
            )}
          </div>
          <span className={`px-3 py-1 text-sm font-bold rounded-full inline-flex items-center gap-1.5 ${requisition.status === 'RETURNED' ? 'bg-teal-100 text-teal-800' :
            requisition.status === 'PARTIALLY_RETURNED' ? 'bg-amber-100 text-amber-800' :
              requisition.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                requisition.status === 'DISPATCHED' ? 'bg-purple-100 text-purple-800' :
                  requisition.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                    requisition.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
            }`}>
            {requisition.status === 'RETURNED' ? (
              <>
                <CheckCircle2 size={14} />
                <span>คืนสโตร์ครบถ้วนแล้ว</span>
              </>
            ) : requisition.status === 'PARTIALLY_RETURNED' ? (
              <>
                <RotateCcw size={14} />
                <span>คืนของบางส่วน</span>
              </>
            ) : requisition.status === 'COMPLETED' ? (
              <>
                <CheckCircle2 size={14} />
                <span>รับของแล้ว</span>
              </>
            ) : requisition.status === 'DISPATCHED' ? (
              <>
                <Truck size={14} />
                <span>อยู่ระหว่างจัดส่ง</span>
              </>
            ) : requisition.status === 'APPROVED' ? (
              <>
                <Clock size={14} />
                <span>รอสโตร์จัดของ/ส่งมอบ</span>
              </>
            ) : requisition.status === 'REJECTED' ? (
              <>
                <XCircle size={14} />
                <span>ไม่อนุมัติ</span>
              </>
            ) : (
              <>
                <Clock size={14} />
                <span>รออนุมัติ</span>
              </>
            )}
          </span>
        </div>

        {/* Metadata Grid (Adapted for Type) */}
        {requisition.requisitionType === 'CLAIM' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm bg-violet-50/50 p-4 rounded-2xl border border-violet-200/80">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">เลขที่ใบเบิกเคลม</p>
              <p className="font-bold text-slate-900 text-base">{requisition.requisitionNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">วันที่ทำรายการ</p>
              <p className="font-bold text-slate-900">{new Date(requisition.date).toLocaleDateString('th-TH')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-900 mb-1">กำหนดส่งมอบเคลม</p>
              <p className="font-bold text-violet-700">
                {requisition.deliveryDate ? new Date(requisition.deliveryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">สาขาผู้จ่ายของ</p>
              <p className="font-semibold text-slate-800">{requisition.branch || 'BKK-HQ'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-500 mb-1">ชื่องานเคลม / ลูกค้า / อ้างอิง</p>
              <p className="font-bold text-violet-900 text-sm">{requisition.projectName || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">สถานที่จัดส่ง / ปลายทาง</p>
              <p className="font-semibold text-slate-800">{requisition.destinationSite || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">เงื่อนไขการคืนสินค้า</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-violet-100 text-violet-800 rounded-md text-xs font-bold border border-violet-200">
                ไม่มีการคืนสินค้าเข้าคลัง
              </span>
            </div>
            {requisition.deliveryNote && (
              <div className="sm:col-span-4">
                <p className="text-xs font-semibold text-slate-500 mb-1">สาเหตุการเคลม &amp; รายละเอียดการจัดส่ง</p>
                <p className="text-slate-700 font-medium">{requisition.deliveryNote}</p>
              </div>
            )}
          </div>
        ) : requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">เลขที่ใบเบิกยืม</p>
              <p className="font-bold text-slate-900 text-base">{requisition.requisitionNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">วันที่เริ่มยืม</p>
              <p className="font-bold text-slate-900">{new Date(requisition.date).toLocaleDateString('th-TH')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-900 mb-1">กำหนดส่งคืนสโตร์</p>
              <p className="font-black text-rose-600 text-sm">
                {requisition.deliveryDate ? new Date(requisition.deliveryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">สาขา / คลังที่ยืม</p>
              <p className="font-semibold text-slate-800">{requisition.branch || 'BKK-HQ'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-500 mb-1">วัตถุประสงค์ในการยืม</p>
              <p className="font-bold text-amber-950">{requisition.deliveryNote || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">สถานที่นำไปใช้งาน</p>
              <p className="font-semibold text-slate-800">{requisition.destinationSite || '-'}</p>
            </div>
            {requisition.projectName && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">โครงการที่เกี่ยวข้อง</p>
                <p className="font-semibold text-blue-700">{requisition.projectName}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">เลขที่ใบเบิกโครงการ</p>
              <p className="font-bold text-slate-900 text-base">{requisition.requisitionNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">วันที่ทำรายการ</p>
              <p className="font-bold text-slate-900">{new Date(requisition.date).toLocaleDateString('th-TH')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">วันส่งของถึงหน้างาน</p>
              <p className="font-bold text-blue-700">
                {requisition.deliveryDate ? new Date(requisition.deliveryDate).toLocaleDateString('th-TH') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">สาขาผู้จัดส่ง</p>
              <p className="font-semibold text-slate-800">{requisition.branch || 'BKK-HQ'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-500 mb-1">โครงการ / ชื่องานติดตั้ง</p>
              <p className="font-bold text-blue-800 text-sm">{requisition.projectName || '-'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-500 mb-1">ไซต์งานติดตั้ง (Site Address)</p>
              <p className="font-semibold text-slate-800">{requisition.destinationSite || '-'}</p>
            </div>
            {requisition.deliveryNote && (
              <div className="sm:col-span-4">
                <p className="text-xs font-semibold text-slate-500 mb-1">วิธีการจัดส่ง & ผู้รับหน้างาน</p>
                <p className="text-slate-700">{requisition.deliveryNote}</p>
              </div>
            )}
          </div>
        )}

        {/* Items Interactive Section (Check Used Items & Add Products across all roles) */}
        <RequisitionItemsInteractiveSection
          key={`${serializedRequisition.id}:${JSON.stringify(serializedRequisition.items || [])}`}
          requisition={serializedRequisition}
          canEditItems={canEditItems}
          sectionId="items-editor"
        />

        {/* 6-Party Signatures & Tracking */}
        <RequisitionDetailSignaturesSection
          initialRequisition={serializedRequisition}
          currentUserName={session.fullName || ''}
          canSignStore={canSignStore}
          canSignAccounting={canSignAccounting}
          canSignTransport={canSignTransport}
          canSignReceiver={true}
          isAccountingUser={isAccountingUser}
          isTransportUser={isTransportUser}
          savedStoreSignatureUrl={savedStoreSignatureUrl}
          savedAccountingSignatureUrl={savedAccountingSignatureUrl}
          savedTransportSignatureUrl={savedTransportSignatureUrl}
        />
      </div>
    </div>
  );
}
