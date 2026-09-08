import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import PRListClient from './PRListClient';
import { isSuperUser } from '@/app/lib/roleHelper';

export const dynamic = 'force-dynamic';

export default async function PRListPage(props: { searchParams?: Promise<any> | any }) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const initialSearch = typeof searchParams.search === 'string' ? searchParams.search : '';
  const initialStatus = typeof searchParams.status === 'string' ? searchParams.status : 'ALL';

  const user = await getUser();
  if (!user) redirect('/');

  // Only Admin, Manager, or Purchasing can view this
  const userRoleStr = (user.role || '').toLowerCase();
  const isSuperAdmin = isSuperUser(user.role);
  const isPurchasingOrAdmin = isSuperAdmin || ['purchasing', 'จัดซื้อ', 'admin', 'ผู้จัดการ', 'manager', 'director'].some((r) => userRoleStr.includes(r));
  
  if (!isPurchasingOrAdmin) {
    redirect('/dashboard');
  }

  const prs = await prisma.purchaseRequest.findMany({
    orderBy: [
      { recordedAt: 'desc' },
      { createdAt: 'desc' }
    ],
    include: {
      purchaseOrders: {
        select: {
          id: true,
          poNumber: true,
          vendorName: true,
          totalAmount: true,
          receiveStatus: true,
          recordedAt: true
        }
      }
    }
  });

  const pendingPrOrders = await prisma.order.findMany({
    where: {
      prRequired: true,
      purchaseRequests: { none: {} }
    },
    include: {
      company: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  const serializedPrs = prs.map(pr => ({
    ...pr,
    purchaseOrders: pr.purchaseOrders?.map((po: any) => ({
      ...po,
      totalAmount: po.totalAmount ? Number(po.totalAmount) : null
    }))
  }));

  const serializedPendingOrders = pendingPrOrders.map(order => ({
    ...order,
    orderTotal: (order as any).orderTotal ? Number((order as any).orderTotal) : null
  }));

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      <PRListClient 
        initialPrs={serializedPrs} 
        pendingPrOrders={serializedPendingOrders}
        initialSearch={initialSearch}
        initialStatus={initialStatus}
      />
    </div>
  );
}
