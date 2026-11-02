import { getUser } from '@/app/lib/dal';
import Sidebar from '@/app/components/Sidebar';

export default async function RequisitionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex h-screen print:h-auto bg-slate-50 text-gray-900 font-sans overflow-hidden print:overflow-visible print:block">
      <div className="print:hidden shrink-0">
        <Sidebar activeRoute="/requisitions" userFullName={user?.fullName} userId={user?.id} userRole={user?.role} />
      </div>
      <main className="flex-1 flex flex-col overflow-y-auto print:overflow-visible print:h-auto print:block bg-[#fafbfc]">
        {children}
      </main>
    </div>
  );
}
