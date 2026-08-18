import { Suspense } from 'react';
import { getServiceCallLogById } from '@/app/actions/service-calls';
import { getUser } from '@/app/lib/dal';
import ServiceCallDetailClient from './ServiceCallDetailClient';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'รายละเอียดบันทึกแจ้งปัญหาลูกค้า',
};

export default async function ServiceCallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getUser();
  if (!currentUser) {
    return <div className="p-8 text-center text-red-500">กรุณาเข้าสู่ระบบ</div>;
  }

  try {
    const { id } = await params;
    const logData = await getServiceCallLogById(id);
    
    return (
      <Suspense fallback={<div className="p-8 text-center">กำลังโหลด...</div>}>
        <ServiceCallDetailClient initialData={logData} currentUser={currentUser} />
      </Suspense>
    );
  } catch (error) {
    return notFound();
  }
}
