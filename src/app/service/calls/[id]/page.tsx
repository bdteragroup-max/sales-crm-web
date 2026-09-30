import { Suspense } from 'react';
import { getServiceCallLogById } from '@/app/actions/service-calls';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import ServiceCallDetailClient from './ServiceCallDetailClient';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'รายละเอียดบันทึกแจ้งปัญหาลูกค้า (Service Call Details)',
};

export default async function ServiceCallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getUser();
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <p className="text-gray-700 font-medium">กรุณาเข้าสู่ระบบเพื่อดูรายละเอียดเคสนี้</p>
        </div>
      </div>
    );
  }

  try {
    const { id } = await params;
    const [logData, rawUsers] = await Promise.all([
      getServiceCallLogById(id),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true, role: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    const users = JSON.parse(JSON.stringify(rawUsers));

    return (
      <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 font-medium">กำลังโหลดข้อมูลเคส...</div>}>
        <ServiceCallDetailClient
          initialData={logData}
          currentUser={currentUser}
          users={users}
        />
      </Suspense>
    );
  } catch (error) {
    return notFound();
  }
}
