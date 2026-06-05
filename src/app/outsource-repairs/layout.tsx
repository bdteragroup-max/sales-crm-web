import { getUser } from '@/app/lib/dal';
import Sidebar from '@/app/components/Sidebar';

export default async function OutsourceRepairsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex h-screen print:h-auto bg-slate-50 text-gray-900 font-sans overflow-hidden print:overflow-visible print:block">
      <Sidebar activeRoute="/outsource-repairs" userFullName={user?.fullName} userId={user?.id} userRole={user?.role} />
      <main className="flex-1 overflow-y-auto print:overflow-visible">
        {children}
      </main>
    </div>
  );
}
