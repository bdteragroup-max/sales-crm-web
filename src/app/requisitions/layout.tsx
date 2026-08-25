import { getUser } from '@/app/lib/dal';
import Sidebar from '@/app/components/Sidebar';

export default async function RequisitionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/requisitions" userFullName={user?.fullName} userId={user?.id} userRole={user?.role} />
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc]">
        {children}
      </main>
    </div>
  );
}
