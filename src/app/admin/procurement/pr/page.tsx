import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import PRListClient from './PRListClient';

export const dynamic = 'force-dynamic';

export default async function PRListPage() {
  const user = await getUser();
  if (!user) redirect('/');

  // Only Admin, Manager, or Purchasing can view this
  const userRoleStr = (user.role || '').toLowerCase();
  const isPurchasingOrAdmin = ['purchasing', 'จัดซื้อ', 'admin', 'ผู้จัดการ', 'manager', 'director'].some((r) => userRoleStr.includes(r));
  
  if (!isPurchasingOrAdmin) {
    redirect('/dashboard');
  }

  const prs = await prisma.purchaseRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      purchaseOrders: {
        select: { poNumber: true, receiveStatus: true }
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">รายการขอซื้อ (Purchase Requests - PR)</h1>
      <PRListClient initialPrs={prs} pendingPrOrders={pendingPrOrders} />
    </div>
  );
}
