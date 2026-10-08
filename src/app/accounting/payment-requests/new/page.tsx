import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import NewPaymentRequestClient from './NewPaymentRequestClient';
import { getSystemBranches, getUserProfileDetails, getPaymentRequests } from '@/app/actions/paymentRequests';

export const dynamic = 'force-dynamic';

export default async function NewPaymentRequestPage() {
  const user = await getUser();
  if (!user || !user.isActive) {
    redirect('/');
  }

  const [branches, profile, myRequests] = await Promise.all([
    getSystemBranches(),
    getUserProfileDetails(user.id, user.employeeId),
    getPaymentRequests({ requesterId: user.id, requesterName: user.fullName }),
  ]);

  const matchedBranch = (branches as any[]).find(
    (b: any) =>
      b.id.toLowerCase() === profile.defaultBranch.toLowerCase() ||
      b.name.toLowerCase() === profile.defaultBranch.toLowerCase() ||
      b.name.toLowerCase().includes(profile.defaultBranch.toLowerCase()) ||
      profile.defaultBranch.toLowerCase().includes(b.id.toLowerCase())
  );
  const initialBranch = matchedBranch ? matchedBranch.name : (branches[0]?.name || 'สำนักงานใหญ่');

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar
        activeRoute="/accounting/payment-requests/new"
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
          initialDept={profile.defaultDept}
          initialPhone={profile.defaultPhone}
          initialSupervisor={profile.supervisorName}
          initialMyRequests={JSON.parse(JSON.stringify(myRequests || []))}
        />
      </main>
    </div>
  );
}
