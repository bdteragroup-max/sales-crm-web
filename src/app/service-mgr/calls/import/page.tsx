import { Suspense } from 'react';
import ServiceMgrImportClient from './ServiceMgrImportClient';

export const metadata = {
  title: 'นำเข้าข้อมูลแจ้งปัญหาเก่า (Excel Import)',
};

export default function ServiceMgrImportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">กำลังโหลด...</div>}>
      <ServiceMgrImportClient />
    </Suspense>
  );
}
