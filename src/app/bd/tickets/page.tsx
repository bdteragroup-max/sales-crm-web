export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import TicketsManageClient from './TicketsManageClient';

export const metadata = {
  title: 'จัดการปัญหาระบบ (Ticket Management)',
};

export default function BDTicketsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">กำลังโหลด...</div>}>
      <TicketsManageClient />
    </Suspense>
  );
}
