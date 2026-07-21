import { getUser } from '@/app/lib/dal';
import Sidebar from '@/app/components/Sidebar';

export default async function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/orders" userFullName={user?.fullName} userId={user?.id} userRole={user?.role} />
      {children}
    </div>
  );
}
