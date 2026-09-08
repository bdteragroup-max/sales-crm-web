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
  }));

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      <POListClient initialPos={serializedPos} initialSearch={initialSearch} />
    </div>
  );
}
