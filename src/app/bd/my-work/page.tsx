import { Suspense } from 'react';
import MyWorkClient from './MyWorkClient';
import { getPersonalWorkData } from '@/app/actions/bd-my-work';
import { getUser } from '@/app/lib/dal';

export const metadata = {
  title: 'งานของฉัน (My Work) - BD',
};

export const dynamic = 'force-dynamic';

export default async function MyWorkPage() {
  const [result, user] = await Promise.all([
    getPersonalWorkData(),
    getUser()
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</div>}>
      <MyWorkClient
        initialData={result.success && result.data ? result.data : []}
        error={result.error}
        currentUser={user}
      />
    </Suspense>
  );
}
