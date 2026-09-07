import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import StoreReceiveClient from './StoreReceiveClient';
import { getRetroactiveReceivedBy } from '@/app/lib/poHelper';

export const dynamic = 'force-dynamic';

export default async function StoreReceivePage() {
  const user = await getUser();
  if (!user) redirect('/');

  const userRoleStr = (user.role || '').toLowerCase();
  const isStore = ['store', 'สโตร์', 'คลังสินค้า', 'warehouse', 'admin'].some((r) => userRoleStr.includes(r));
  
  if (!isStore) {
    redirect('/dashboard');
  }

  // Auto-resolve pending retroactive POs (goods were already received at site)
  const pendingRetroPOs = await prisma.purchaseOrder.findMany({
    where: {
      AND: [
        {
          OR: [
            { receiveStatus: null },
            { receiveStatus: { notIn: ['Received', 'Cancelled'] } }
          ]
        },
        {
          OR: [
            { note: { contains: 'ย้อนหลัง', mode: 'insensitive' } },
            { note: { contains: 'ซื้อเองหน้างาน', mode: 'insensitive' } },
            { note: { contains: 'เอาของมาแล้ว', mode: 'insensitive' } }
          ]
        }
      ]
    },
    select: { id: true, reportedBy: true, deliveryDate: true, recordedAt: true, createdAt: true }
  });

  if (pendingRetroPOs.length > 0) {
    await Promise.all(
      pendingRetroPOs.map(po =>
        prisma.purchaseOrder.update({
          where: { id: po.id },
          data: {
            receiveStatus: 'Received',
            receivedBy: getRetroactiveReceivedBy(po.reportedBy),
            receivedAt: po.deliveryDate || po.recordedAt || po.createdAt || new Date()
          }
        })
      )
    );
  }

  // Fetch pending POs (receiveStatus != 'Received' and != 'Cancelled')
  const pendingPOs = await prisma.purchaseOrder.findMany({
    where: {
      OR: [
        { receiveStatus: null },
        { receiveStatus: { notIn: ['Received', 'Cancelled'] } }
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

  const serializedPOs = pendingPOs.map(po => ({
    ...po,
    totalAmount: po.totalAmount ? Number(po.totalAmount) : null,
    depositAmount: po.depositAmount ? Number(po.depositAmount) : null,
    remainingAmount: po.remainingAmount ? Number(po.remainingAmount) : null,
    payment1: po.payment1 ? Number(po.payment1) : null,
    projectName: po.purchaseRequest?.projectName || po.jobName || '-',
  }));

  // Fetch received POs (limit to recent 100)
  const receivedPOs = await prisma.purchaseOrder.findMany({
    where: {
      receiveStatus: 'Received'
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
    },
    take: 100
  });

  const serializedReceivedPOs = receivedPOs.map(po => ({
    ...po,
    totalAmount: po.totalAmount ? Number(po.totalAmount) : null,
    depositAmount: po.depositAmount ? Number(po.depositAmount) : null,
    remainingAmount: po.remainingAmount ? Number(po.remainingAmount) : null,
    payment1: po.payment1 ? Number(po.payment1) : null,
    projectName: po.purchaseRequest?.projectName || po.jobName || '-',
  }));

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">รายการรับสินค้าเข้าสโตร์ (Store Receiving)</h1>
      <StoreReceiveClient initialPos={serializedPOs} initialReceivedPos={serializedReceivedPOs} userName={user.fullName} />
    </div>
  );
}
