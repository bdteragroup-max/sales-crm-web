import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import POListClient from './POListClient';

export const dynamic = 'force-dynamic';

export default async function POListPage() {
  const user = await getUser();
  if (!user) redirect('/');

  // Only Admin, Manager, or Purchasing can view this
  const userRoleStr = (user.role || '').toLowerCase();
  const isPurchasingOrAdmin = ['purchasing', 'จัดซื้อ', 'admin', 'ผู้จัดการ', 'manager', 'director'].some((r) => userRoleStr.includes(r));
  
  if (!isPurchasingOrAdmin) {
    redirect('/dashboard');
  }

  const pos = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">รายการสั่งซื้อ (Purchase Orders - PO)</h1>
      <POListClient initialPos={pos} />
    </div>
  );
}
