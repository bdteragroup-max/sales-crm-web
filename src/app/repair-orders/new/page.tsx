import { redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import NewRepairOrderForm from './NewRepairOrderForm';

export const metadata = {
  title: 'สร้างใบแจ้งซ่อมใหม่ - CRM',
};

export default async function NewRepairOrderPage() {
  const currentUser = await getUser();
  if (!currentUser) {
    redirect('/login');
  }

  // Fetch active users for the "Receiver" dropdown
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      employeeSale: {
        select: { position: true }
      }
    },
    orderBy: { fullName: 'asc' }
  });

  const formattedUsers = users.map(u => ({
    id: u.id,
    name: u.fullName,
    position: u.employeeSale?.position || 'Sales Rep'
  }));

  return (
    <div className="flex-1 w-full h-full bg-gray-50/50 p-4 md:p-8 overflow-y-auto custom-scrollbar relative">
      <div className="w-full max-w-5xl mx-auto">
        <NewRepairOrderForm 
          users={formattedUsers} 
          currentUserId={currentUser.id} 
        />
      </div>
    </div>
  );
}
