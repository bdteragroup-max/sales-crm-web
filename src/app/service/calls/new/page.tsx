import { Suspense } from 'react';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import NewServiceCallClient from './NewServiceCallClient';

export const metadata = {
  title: 'เปิดเคสบันทึกแจ้งปัญหาลูกค้าใหม่ (New Service Call)',
};

export const dynamic = 'force-dynamic';

export default async function NewServiceCallPage() {
  const [currentUser, rawUsers] = await Promise.all([
    getUser(),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  const users = JSON.parse(JSON.stringify(rawUsers));

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 font-medium">
          กำลังโหลด...
        </div>
      }
    >
      <NewServiceCallClient users={users} currentUser={currentUser} />
    </Suspense>
  );
}
