import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import POListClient from './POListClient';
import { isSuperUser } from '@/app/lib/roleHelper';

export const dynamic = 'force-dynamic';

export default async function POListPage(props: { searchParams?: Promise<any> | any }) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const initialSearch = searchParams.search || '';

  const user = await getUser();
  if (!user) redirect('/');

  // Only Admin, Manager, or Purchasing can view this
  const userRoleStr = (user.role || '').toLowerCase();
  const isSuperAdmin = isSuperUser(user.role);
  const isPurchasingOrAdmin = isSuperAdmin || ['purchasing', 'จัดซื้อ', 'admin', 'ผู้จัดการ', 'manager', 'director'].some((r) => userRoleStr.includes(r));
  
  if (!isPurchasingOrAdmin) {
    redirect('/dashboard');
  }

  const pos = await prisma.purchaseOrder.findMany({
    include: {
      purchaseRequest: {
        select: { projectName: true }
      },
      supplierPaymentTasks: {
        select: {
          id: true,
          paymentType: true,
          sequenceNo: true,
          grossAmount: true,
          whtPercent: true,
          whtAmount: true,
          netPayableAmount: true,
          dueDate: true,
          paymentMethod: true,
          chequeNumber: true,
          chequeDueDate: true,
          isGoodsReceived: true,
          status: true,
          paidDate: true,
          paidAmount: true,
          paidFromBankCode: true,
          bankReferenceNumber: true,
          whtCertNumber: true,
          note: true,
          updatedAt: true,
        },
        orderBy: { sequenceNo: 'asc' }
      }
    },
    orderBy: [
      { recordedAt: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  const serializedPos = pos.map(po => ({
    ...po,
    totalAmount: po.totalAmount ? Number(po.totalAmount) : null,
    depositAmount: po.depositAmount ? Number(po.depositAmount) : null,
    remainingAmount: po.remainingAmount ? Number(po.remainingAmount) : null,
    payment1: po.payment1 ? Number(po.payment1) : null,
    supplierPaymentTasks: (po.supplierPaymentTasks || []).map(t => ({
      ...t,
      grossAmount: Number(t.grossAmount) || 0,
      whtPercent: Number(t.whtPercent) || 0,
      whtAmount: Number(t.whtAmount) || 0,
      netPayableAmount: Number(t.netPayableAmount) || 0,
      paidAmount: t.paidAmount ? Number(t.paidAmount) : null,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      paidDate: t.paidDate ? t.paidDate.toISOString() : null,
      chequeDueDate: t.chequeDueDate ? t.chequeDueDate.toISOString() : null,
      updatedAt: t.updatedAt ? t.updatedAt.toISOString() : null,
    }))
  }));

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      <POListClient initialPos={serializedPos} initialSearch={initialSearch} />
    </div>
  );
}
