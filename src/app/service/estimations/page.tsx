import { redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import EstimationsClientPage from './EstimationsClientPage'; // force ts update

export const metadata = {
  title: 'ประเมินราคา - TERA CRM',
};

export default async function EstimationsPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const employee = user?.employeeId
    ? await prisma.employees.findUnique({ where: { emp_id: user.employeeId } })
    : null;

  const currentUser = {
    ...user,
    fullName: employee?.name || user?.fullName || 'ผู้ใช้งานระบบ',
  };

  // Fetch only requirements that are sent to service
  const records = await prisma.customerRequirement.findMany({
    where: { isSentToService: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <EstimationsClientPage
      currentUser={currentUser}
      initialRecords={records}
    />
  );
}
