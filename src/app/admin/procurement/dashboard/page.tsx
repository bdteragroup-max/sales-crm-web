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
      receiveStatus: true,
      totalAmount: true,
      creditTerm: true,
      createdAt: true
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">แดชบอร์ดจัดซื้อ (Procurement Dashboard)</h1>
      <DashboardClient pos={serializedPos} prs={prs} />
    </div>
  );
}
