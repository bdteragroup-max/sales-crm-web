import { getUser } from '@/app/lib/dal';
import { redirect, notFound } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import NewPaymentRequestClient from '../../new/NewPaymentRequestClient';
import {
  getPaymentRequestById,
  getSystemBranches,
  getUserProfileDetails,
  getPaymentRequests,
} from '@/app/actions/paymentRequests';
import { isAccountingStaff } from '@/app/lib/roleHelper';

export const dynamic = 'force-dynamic';

export default async function EditPaymentRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user || !user.isActive) {
    redirect('/');
  }

  const { id } = await params;
  const [request, branches, profile, myRequests] = await Promise.all([
    getPaymentRequestById(id),
    getSystemBranches(),
    getUserProfileDetails(user.id, user.employeeId),
    getPaymentRequests({ requesterId: user.id, requesterName: user.fullName }),
  ]);

  if (!request) {
    notFound();
  }

  const isStaff = isAccountingStaff(user.role);
  const isOwner =
    (user.id && request.requester_id === user.id) ||
    (user.fullName && request.requester_name?.trim().toLowerCase() === user.fullName.trim().toLowerCase());

  // Only the owner or accounting staff can edit
  if (!isStaff && !isOwner) {
    redirect(`/accounting/payment-requests/${id}`);
  }

  // Only allow editable statuses
  const allowedStatuses = ['RETURN_DOCUMENT', 'DRAFT', 'PENDING_SUPERVISOR', 'SUBMITTED', 'HOLD_DUPLICATE'];
  if (!isStaff && !allowedStatuses.includes(request.status)) {
    redirect(`/accounting/payment-requests/${id}`);
  }

  const matchedBranch = (branches as any[]).find(
    (b: any) =>
      b.id.toLowerCase() === (request.branch || profile.defaultBranch).toLowerCase() ||
      b.name.toLowerCase() === (request.branch || profile.defaultBranch).toLowerCase() ||
      b.name.toLowerCase().includes((request.branch || profile.defaultBranch).toLowerCase())
  );
  const initialBranch = matchedBranch ? matchedBranch.name : (request.branch || branches[0]?.name || 'สำนักงานใหญ่');

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar
        activeRoute="/accounting/payment-requests"
        userFullName={user.fullName}
        userId={user.id}
        userRole={user.role}
      />
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc]">
        <NewPaymentRequestClient
          currentUser={{
            id: user.id,
            fullName: user.fullName,
            role: user.role,
          }}
          branches={branches}
          initialBranch={initialBranch}
          initialDept={request.requester_department || profile.defaultDept}
          initialPhone={request.requester_phone || profile.defaultPhone}
          initialSupervisor={request.assigned_supervisor_name || profile.supervisorName}
          initialMyRequests={JSON.parse(JSON.stringify(myRequests || []))}
          isEditMode={true}
          initialData={JSON.parse(JSON.stringify(request))}
        />
      </main>
    </div>
  );
}
