import React from 'react';
import RequisitionForm from './RequisitionForm';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { Package, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'สร้างใบเบิก/ยืมของ - TeraSales',
};

export default async function NewRequisitionPage(props: {
  searchParams?: Promise<{ projectId?: string; type?: string; branch?: string }>;
}) {
  const session = await getUser();
  if (!session) return <div>Unauthorized</div>;

  const searchParams = props.searchParams ? await props.searchParams : {};

  // Fetch users for approver dropdown
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: 'asc' }
  });

  // Fetch active projects for quick selection
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      projectNumber: true,
      name: true,
      clientName: true,
      siteAddress: true,
      province: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  // Reuse latest saved signature for one-tap mobile signing
  const latestSigRecord = await prisma.materialRequisition.findFirst({
    where: {
      OR: [
        { requesterId: session.id, requesterSignatureUrl: { not: null } },
        { approverId: session.id, approverSignatureUrl: { not: null } },
        { storeStaffId: session.id, storeStaffSignatureUrl: { not: null } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      requesterId: true,
      requesterSignatureUrl: true,
      approverId: true,
      approverSignatureUrl: true,
      storeStaffId: true,
      storeStaffSignatureUrl: true,
    },
  });

  const savedSignatureUrl = latestSigRecord
    ? (latestSigRecord.requesterId === session.id && latestSigRecord.requesterSignatureUrl) ||
      (latestSigRecord.approverId === session.id && latestSigRecord.approverSignatureUrl) ||
      (latestSigRecord.storeStaffId === session.id && latestSigRecord.storeStaffSignatureUrl) ||
      null
    : null;

  return (
    <div className="w-full max-w-5xl mx-auto px-3 py-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 pb-28 md:pb-10">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
        <Link
          href="/requisitions"
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm shrink-0"
          aria-label="กลับหน้ารายการใบเบิก"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2 leading-tight">
            <Package className="text-red-600 shrink-0" size={20} />
            <span className="truncate">สร้างใบเบิกโครงการ / ยืม / เคลม</span>
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5 leading-snug">
            กรอกข้อมูลเพื่อส่งคำขอเบิกของเข้าโครงการ ยืมเครื่องมืออุปกรณ์ หรือเบิกเคลมสินค้า (ไม่คืนของ)
          </p>
        </div>
      </div>

      <RequisitionForm
        users={users}
        currentUser={session}
        projects={projects}
        initialProjectId={searchParams.projectId}
        initialType={searchParams.type}
        initialBranch={searchParams.branch}
        savedSignatureUrl={savedSignatureUrl}
      />
    </div>
  );
}
