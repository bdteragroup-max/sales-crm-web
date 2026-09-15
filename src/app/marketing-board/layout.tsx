import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { decrypt } from '@/app/lib/session';
import prisma from '@/app/lib/db';
import Sidebar from '@/app/components/Sidebar';

export const metadata = {
  title: 'กระดานการตลาด (Marketing Board) | TERA Group',
  description: 'ศูนย์รวมโปรโมชั่น ข่าวสารการตลาด และเอกสารช่วยขายสำหรับทีมขายและสาขาทั่วประเทศ'
};

export default async function MarketingBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const payload = await decrypt(sessionCookie);

  if (!payload?.userId) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { employeeSale: true }
  });

  if (!user || !user.isActive) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        activeRoute="/marketing-board" 
        userFullName={user.fullName} 
        userId={user.employeeId || user.id} 
        userRole={user.role} 
      />
      <div className="flex-1 overflow-y-auto min-w-0">
        {children}
      </div>
    </div>
  );
}
