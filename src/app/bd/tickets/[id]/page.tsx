export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import TicketManageDetailClient from './TicketManageDetailClient';

export const metadata = {
  title: 'จัดการปัญหาระบบ (Manage Ticket)',
};

export default async function TicketManageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<div className="p-8 text-center">กำลังโหลด...</div>}>
      <TicketManageDetailClient ticketId={resolvedParams.id} />
    </Suspense>
  );
}
