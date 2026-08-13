export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import TicketsClientPage from './TicketsClientPage';

export const metadata = {
  title: 'แจ้งปัญหาระบบ (Support Tickets)',
};

export default function SupportTicketsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">กำลังโหลด...</div>}>
      <TicketsClientPage />
    </Suspense>
  );
}
