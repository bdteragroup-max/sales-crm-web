import { getUser } from '@/app/lib/dal';
import { redirect, notFound } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import PaymentRequestDetailClient from './PaymentRequestDetailClient';
import { getPaymentRequestById } from '@/app/actions/paymentRequests';

export const dynamic = 'force-dynamic';

export default async function PaymentRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user || !user.isActive) {
    redirect('/');
  }

  const { id } = await params;
  const request = await getPaymentRequestById(id);

  if (!request) {
    notFound();
  }

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar
        activeRoute="/accounting/payment-requests"
        userFullName={user.fullName}
        userId={user.id}
        userRole={user.role}
      />
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc]">
        <PaymentRequestDetailClient
          request={JSON.parse(JSON.stringify(request))}
          currentUser={{
            id: user.id,
            fullName: user.fullName,
            role: user.role,
          }}
        />
      </main>
    </div>
  );
}
