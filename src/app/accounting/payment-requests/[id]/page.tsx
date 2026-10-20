import { getUser } from '@/app/lib/dal';
import { redirect, notFound } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import PaymentRequestDetailClient from './PaymentRequestDetailClient';
import { getPaymentRequestById, getUserProfileDetails } from '@/app/actions/paymentRequests';

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
  const [request, profile] = await Promise.all([
    getPaymentRequestById(id),
    getUserProfileDetails(user.id, user.employeeId),
  ]);

  if (!request) {
    notFound();
  }

  let isDirectSupervisor = false;
  if (user.employeeId && request.requester_name) {
    try {
      const { teraDb } = await import('@/app/lib/teraDb');
      const directSub = await teraDb.employees.findFirst({
        where: {
          OR: [
            { supervisor_id: user.employeeId },
            { secondary_supervisor_id: user.employeeId },
          ],
          name: { contains: request.requester_name?.trim() },
        },
      });
      if (directSub) isDirectSupervisor = true;
    } catch (e) {
      console.warn('Error checking direct supervisor in PaymentRequestDetailPage:', e);
    }
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
            employeeId: user.employeeId,
            department: profile.defaultDept,
            branch: profile.defaultBranch,
            isDirectSupervisor,
          }}
        />
      </main>
    </div>
  );
}
