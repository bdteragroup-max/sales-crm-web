import { redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import NewRepairOrderForm from './NewRepairOrderForm';

export const metadata = {
  title: 'สร้างใบแจ้งซ่อมใหม่ - CRM',
};

export default async function NewRepairOrderPage(
  props: { searchParams: Promise<{ jobId?: string }> }
) {
  const searchParams = await props.searchParams;
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

  let initialData: any = undefined;
  if (searchParams.jobId) {
    const job = await prisma.job.findUnique({
      where: { id: searchParams.jobId }
    });
    if (job) {
      initialData = {
        jobId: job.id,
        customerCompany: job.customerName || "",
        company: job.companyCode || "",
        salesPerson: job.sellerName || "",
        job: job,
      };
    }
  }

  return (
    <div className="flex-1 w-full h-full bg-gray-50/50 p-4 md:p-8 overflow-y-auto custom-scrollbar relative">
      <div className="w-full max-w-5xl mx-auto">
        <NewRepairOrderForm 
          users={formattedUsers} 
          currentUserId={currentUser.id} 
          initialData={initialData}
        />
      </div>
    </div>
  );
}
