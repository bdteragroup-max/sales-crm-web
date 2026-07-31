import { getUser } from '@/app/lib/dal';
import Sidebar from '@/app/components/Sidebar';
import { redirect } from 'next/navigation';

export default async function ExecutiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect('/');
  }

  const roleStr = (user.role || '').toLowerCase();
  const isExecutive = roleStr === 'ผู้บริหาร' || roleStr === 'executive' || roleStr === 'super_admin';

  if (!isExecutive) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/executive/kpi" userFullName={user.fullName} userId={user.id} userRole={user.role} />
      {children}
    </div>
  );
}
