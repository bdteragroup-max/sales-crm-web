import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import StoreDashboardClient from './StoreDashboardClient';

export const dynamic = 'force-dynamic';

export default async function StoreDashboardPage() {
  const user = await getUser();
  if (!user) redirect('/');

  const userRoleStr = (user.role || '').toLowerCase();
  const isStore = ['store', 'สโตร์', 'คลังสินค้า', 'warehouse', 'admin'].some((r) => userRoleStr.includes(r));
  
  if (!isStore) {
    redirect('/dashboard');
  }

  // Fetch pending POs
  const pendingPOs = await prisma.purchaseOrder.findMany({
    where: {
      OR: [
        { receiveStatus: null },
        { receiveStatus: { not: 'Received' } }
      ]
    },
    include: {
      purchaseRequest: {
        select: {
          projectName: true
        }
      }
    },
    orderBy: {
      deliveryDate: 'asc'
    }
  });

  // Fetch recently received POs (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const receivedPOs = await prisma.purchaseOrder.findMany({
    where: {
      receiveStatus: 'Received',
      receivedAt: {
        gte: thirtyDaysAgo
      }
    },
    include: {
      purchaseRequest: {
        select: {
          projectName: true
        }
      }
    },
    orderBy: {
      receivedAt: 'desc'
    }
  });

  const serializePOs = (pos: any[]) => pos.map(po => ({
    ...po,
    totalAmount: po.totalAmount ? Number(po.totalAmount) : null,
    depositAmount: po.depositAmount ? Number(po.depositAmount) : null,
    remainingAmount: po.remainingAmount ? Number(po.remainingAmount) : null,
    payment1: po.payment1 ? Number(po.payment1) : null,
    projectName: po.purchaseRequest?.projectName || po.jobName || '-',
  }));

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">แดชบอร์ดสโตร์ (Store Dashboard)</h1>
      <StoreDashboardClient pendingPOs={serializePOs(pendingPOs)} receivedPOs={serializePOs(receivedPOs)} />
    </div>
  );
}
