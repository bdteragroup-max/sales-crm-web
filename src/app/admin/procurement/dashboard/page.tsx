import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function ProcurementDashboardPage() {
  const user = await getUser();
  if (!user) redirect('/');

  const userRoleStr = (user.role || '').toLowerCase();
  const isPurchasingOrAdmin = ['purchasing', 'จัดซื้อ', 'admin', 'ผู้จัดการ', 'manager', 'director'].some((r) => userRoleStr.includes(r));
  
  if (!isPurchasingOrAdmin) {
    redirect('/dashboard');
  }

  // Fetch data needed for metrics
  const pos = await prisma.purchaseOrder.findMany({
    select: {
      id: true,
      poNumber: true,
      prNumber: true,
      receiveStatus: true,
      totalAmount: true,
      creditTerm: true,
      recordedAt: true,
      createdAt: true,
      vendorName: true,
      jobName: true,
      itemList: true,
      deliveryDate: true,
      receivedBy: true,
      purchaseRequest: {
        select: {
          projectName: true
        }
      }
    },
    orderBy: {
      recordedAt: 'desc'
    }
  });

  const serializedPos = pos.map(po => ({
    ...po,
    totalAmount: po.totalAmount ? Number(po.totalAmount) : null,
  }));

  const prs = await prisma.purchaseRequest.findMany({
    select: {
      id: true,
      prNumber: true,
      purchaseOrders: {
        select: { id: true }
      }
    }
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      <DashboardClient pos={serializedPos} prs={prs} />
    </div>
  );
}
