import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import DashboardClient from '@/app/admin/procurement/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function ExecutivePurchasingDashboard() {
  const user = await getUser();
  if (!user) redirect('/');

  const userRoleStr = (user.role || '').toLowerCase();
  const isExecutive = userRoleStr === 'ผู้บริหาร' || userRoleStr === 'executive' || userRoleStr === 'super_admin';
  
  if (!isExecutive) {
    redirect('/dashboard');
  }

  // Fetch data needed for metrics
  const pos = await prisma.purchaseOrder.findMany({
    select: {
      id: true,
      poNumber: true,
      receiveStatus: true,
      totalAmount: true,
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
    <div className="flex-1 h-full overflow-y-auto bg-gray-50 p-6 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">ภาพรวมการจัดซื้อ (Purchasing Overview)</h1>
      <DashboardClient pos={serializedPos} prs={prs} />
    </div>
  );
}
