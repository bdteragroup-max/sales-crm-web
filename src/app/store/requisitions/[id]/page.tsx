import React from 'react';
import StoreFulfillForm from './StoreFulfillForm';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import { getRequisitionById } from '@/app/actions/requisitions';
import { getUserLatestRequisitionSignatures } from '@/app/lib/requisitionSignaturesDb';
import { isSuperUser, canViewAll } from '@/app/lib/roleHelper';
import {
  isStoreOrPurchasingRole,
  isTransportRole,
  isAccountingRequisitionRole,
  canViewAllRequisitionsRole,
} from '@/app/lib/requisitionUtils';
import Link from 'next/link';
import { ArrowLeft, PackageX } from 'lucide-react';

export const metadata = {
  title: 'รายละเอียดใบเบิก/ยืมของ - TeraSales',
};

export default async function StoreRequisitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getUser();
  if (!session) {
    return (
      <div className="p-8 text-center text-sm font-bold text-slate-500">
        กรุณาเข้าสู่ระบบก่อนใช้งาน
      </div>
    );
  }

  const res = await getRequisitionById(id);
  const requisition = res.success ? res.data : null;

  if (!requisition) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <PackageX size={26} />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-black text-slate-900">ไม่พบข้อมูลใบเบิก/ยืมของ</h1>
          <p className="text-xs text-slate-500">
            รายการนี้อาจถูกลบหรือลิงก์ไม่ถูกต้อง กรุณากลับไปตรวจสอบที่หน้ารายการสโตร์
          </p>
        </div>
        <Link
          href="/store/requisitions"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={15} />
          <span>กลับหน้ารายการเบิก/ยืมวัสดุ</span>
        </Link>
      </div>
    );
  }

  const isSuper = isSuperUser(session.role) || canViewAll(session.role);
  const isStoreOrPurchasing = isStoreOrPurchasingRole(session.role);
  const isTransport = isTransportRole(session.role);
  const isAccounting = isAccountingRequisitionRole(session.role);
  const hasPageAccess =
    isSuper ||
    canViewAllRequisitionsRole(session.role) ||
    requisition.requesterId === session.id ||
    requisition.approverId === session.id;

  if (!hasPageAccess) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-sm font-bold text-rose-600">
        คุณไม่มีสิทธิ์เข้าถึงใบเบิก/ยืมวัสดุรายการนี้
      </div>
    );
  }

  const {
    savedStoreSignatureUrl,
    savedAccountingSignatureUrl,
    savedTransportSignatureUrl,
  } = await getUserLatestRequisitionSignatures(prisma, session.id);

  const canManageStore = isSuper || isStoreOrPurchasing;
  const canSignAccounting = isAccounting;
  const canSignTransport =
    !isAccounting && (isSuper || isStoreOrPurchasing || isTransport);

  const canEditUsedItems =
    (isSuper ||
      isStoreOrPurchasing ||
      requisition.requesterId === session.id ||
      requisition.approverId === session.id) &&
    requisition.status !== 'RETURNED' &&
    requisition.status !== 'REJECTED';

  return (
    <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 pb-28 md:pb-10">
      <StoreFulfillForm
        requisition={JSON.parse(JSON.stringify(requisition))}
        currentUserName={session.fullName || 'เจ้าหน้าที่'}
        userRole={session.role}
        savedStoreSignatureUrl={savedStoreSignatureUrl}
        savedAccountingSignatureUrl={savedAccountingSignatureUrl}
        savedTransportSignatureUrl={savedTransportSignatureUrl}
        canManageStore={canManageStore}
        canSignAccounting={canSignAccounting}
        canSignTransport={canSignTransport}
        isAccountingUser={isAccounting}
        isTransportUser={isTransport}
        canEditUsedItems={canEditUsedItems}
      />
    </div>
  );
}
