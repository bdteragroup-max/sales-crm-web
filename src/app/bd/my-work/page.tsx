import { Suspense } from 'react';
import MyWorkClient from './MyWorkClient';
import { getPersonalWorkData } from '@/app/actions/bd-my-work';

export const metadata = {
  title: 'งานของฉัน (My Work)',
};

export const dynamic = 'force-dynamic';

export default async function MyWorkPage() {
  const result = await getPersonalWorkData();

  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>}>
      <MyWorkClient initialData={result.success && result.data ? result.data : []} error={result.error} />
    </Suspense>
  );
}
