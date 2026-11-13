import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import NewPaymentRequestClient from './NewPaymentRequestClient';
import {
  getSystemBranches,
  getUserProfileDetails,
  getPaymentRequests,
  getSupervisorOptions,
} from '@/app/actions/paymentRequests';

export const dynamic = 'force-dynamic';

export default async function NewPaymentRequestPage() {
  const user = await getUser();
  if (!user || !user.isActive) {
    redirect('/');
  }

  const [branches, profile, myRequests, supervisorOptions] = await Promise.all([
    getSystemBranches(),
    getUserProfileDetails(user.id, user.employeeId),
    getPaymentRequests({ requesterId: user.id, requesterName: user.fullName }),
    getSupervisorOptions(),
  ]);

  const branchQuery = (profile.defaultBranch || '').trim().toLowerCase();
  const matchedBranch = branchQuery
    ? (branches as any[]).find(
        (b: any) =>
          b.id.toLowerCase() === branchQuery ||
          b.name.toLowerCase() === branchQuery ||
          b.name.toLowerCase().includes(branchQuery) ||
          branchQuery.includes(b.id.toLowerCase())
      )
    : undefined;
  const initialBranch = matchedBranch ? matchedBranch.name : (branches[0]?.name || 'สำนักงานใหญ่');

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar
        activeRoute="/accounting/payment-requests/new"
        userFullName={user.fullName}
        userId={user.id}
        userRole={user.role}
      />
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-y-auto overflow-x-hidden bg-[#fafbfc]">
        <NewPaymentRequestClient
          currentUser={{
            id: user.id,
            fullName: user.fullName,
            role: user.role,
            employeeId: user.employeeId,
          }}
          branches={branches}
          initialBranch={initialBranch}
          initialDept={profile.defaultDept}
          initialPhone={profile.defaultPhone}
          initialSupervisor={profile.supervisorName}
          initialSupervisorId={profile.supervisorEmpId}
          supervisorOptions={supervisorOptions}
          initialMyRequests={JSON.parse(JSON.stringify(myRequests || []))}
        />
      </main>
    </div>
  );
}
