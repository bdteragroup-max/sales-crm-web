import { Suspense } from 'react';
import ServiceCallsClientPage from './ServiceCallsClientPage';
import { getServiceCallLogs } from '@/app/actions/service-calls';
import { getUser } from '@/app/lib/dal';

export const metadata = {
  title: 'บันทึกแจ้งปัญหาลูกค้า (Service Call Log)',
};

export const dynamic = 'force-dynamic';

export default async function ServiceCallsPage() {
  const user = await getUser();
  const initialLogs = await getServiceCallLogs({});

  return (
    <Suspense fallback={<div className="p-8 text-center">กำลังโหลด...</div>}>
      <ServiceCallsClientPage initialLogs={initialLogs} userRole={user?.role || ''} />
    </Suspense>
  );
}
