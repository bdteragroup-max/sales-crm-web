import { redirect } from 'next/navigation';
import { getUser, verifySession } from '@/app/lib/dal';
import Sidebar from '@/app/components/Sidebar';

export const metadata = {
  title: 'ศูนย์ขนส่ง & ปิดทริป (Logistics) | TERA Group',
  description: 'ระบบรวมคิวงานจัดส่ง จัดคิวรถวิ่งหลายจุด ปิดส่ง POD บนมือถือ และคิดเบี้ยเลี้ยง/ค่าทางด่วน',
};

export default async function LogisticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session.isAuth) {
    redirect('/login');
  }

  const user = await getUser();

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      <Sidebar
        activeRoute="/logistics"
        userFullName={user?.fullName}
        userId={user?.id}
        userRole={user?.role}
      />
      <div className="flex-1 overflow-y-auto min-w-0">
        {children}
      </div>
    </div>
  );
}
