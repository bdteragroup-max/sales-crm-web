export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import { getUser } from '@/app/lib/dal';
import IntakeClientPage from './IntakeClientPage';

export const metadata = {
  title: 'BD Intake - แบบฟอร์มแจ้งเปิดงานพัฒนาธุรกิจ',
};

export default async function IntakePage() {
  const user = await getUser();

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</div>}>
      <IntakeClientPage currentUser={user} />
    </Suspense>
  );
}

