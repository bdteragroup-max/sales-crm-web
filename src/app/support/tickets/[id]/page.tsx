export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import TicketDetailClient from './TicketDetailClient';

export const metadata = {
  title: 'รายละเอียดปัญหา (Ticket Detail)',
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<div className="p-8 text-center">กำลังโหลด...</div>}>
      <TicketDetailClient ticketId={resolvedParams.id} />
    </Suspense>
  );
}
