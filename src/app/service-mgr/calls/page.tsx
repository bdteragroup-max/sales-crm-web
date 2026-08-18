import { Suspense } from 'react';
import ServiceMgrCallsClient from './ServiceMgrCallsClient';

export const metadata = {
  title: 'แดชบอร์ดจัดการแจ้งปัญหาลูกค้า (MGR)',
};

export default function ServiceMgrCallsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">กำลังโหลด...</div>}>
      <ServiceMgrCallsClient />
    </Suspense>
  );
}
