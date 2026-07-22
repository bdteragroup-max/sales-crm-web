import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
// @ts-ignore - Trigger TS Server refresh
import CreatePRForm from './CreatePRForm';

export const dynamic = 'force-dynamic';

export default async function CreatePRPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const user = await getUser();
  if (!user) redirect('/');

  const userRoleStr = (user.role || '').toLowerCase();
  const isPurchasingOrAdmin = ['purchasing', 'จัดซื้อ', 'admin', 'ผู้จัดการ', 'manager', 'director'].some((r) => userRoleStr.includes(r));
  
  if (!isPurchasingOrAdmin) {
    redirect('/dashboard');
  }

  const orderId = typeof searchParams.orderId === 'string' ? searchParams.orderId : '';
  const note = typeof searchParams.note === 'string' ? searchParams.note : '';
  const project = typeof searchParams.project === 'string' ? searchParams.project : '';

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">สร้างใบขอซื้อ (Create PR)</h1>
      <CreatePRForm 
        defaultOrderId={orderId}
        defaultNote={note}
        defaultProject={project}
      />
    </div>
  );
}
