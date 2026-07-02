import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import StoreReceiveClient from './StoreReceiveClient';

export const dynamic = 'force-dynamic';

export default async function StoreReceivePage() {
  const user = await getUser();
  if (!user) redirect('/');

  const userRoleStr = (user.role || '').toLowerCase();
  const isStore = ['store', 'สโตร์', 'คลังสินค้า', 'warehouse', 'admin'].some((r) => userRoleStr.includes(r));
  
  if (!isStore) {
    redirect('/dashboard');
  }

  // Fetch pending POs (receiveStatus != 'Received')
  const pendingPOs = await prisma.purchaseOrder.findMany({
    where: {
      OR: [
        { receiveStatus: null },
        { receiveStatus: { not: 'Received' } }
      ]
    },
    orderBy: {
      deliveryDate: 'asc'
    }
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Store Receiving (รับสินค้า)</h1>
      <StoreReceiveClient initialPos={pendingPOs} userName={user.fullName} />
    </div>
  );
}
