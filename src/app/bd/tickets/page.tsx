export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import TicketsManageClient from './TicketsManageClient';
import { getUser } from '@/app/lib/dal';

export const metadata = {
  title: 'จัดการปัญหาระบบ (Support & Helpdesk) - Business Development',
};

export default async function BDTicketsPage() {
  const user = await getUser();

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">กำลังโหลดระบบรับแจ้งปัญหา...</div>}>
      <TicketsManageClient currentUser={user} />
    </Suspense>
  );
}
