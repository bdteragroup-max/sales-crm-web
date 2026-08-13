import { getUser } from '@/app/lib/dal';
import Sidebar from '@/app/components/Sidebar';

export default async function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/support/tickets" userFullName={user?.fullName} userId={user?.id} userRole={user?.role} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
