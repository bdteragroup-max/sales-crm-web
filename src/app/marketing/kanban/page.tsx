import React from 'react';
import KanbanBoardClient from './KanbanBoardClient';
import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';

export default async function KanbanPage() {
  const session = await getUser();

  if (!session) {
    redirect('/login');
  }

  // Marketing roles or managers
  const roleStr = (session.role || '').toLowerCase();
  const isMarketing = ['marketing', 'การตลาด', 'ผู้จัดการ', 'manager', 'executive', 'super_admin'].some(r => roleStr.includes(r));

  if (!isMarketing) {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        คุณไม่มีสิทธิ์เข้าถึงกระดานงานการตลาด
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <KanbanBoardClient currentUser={session} />
    </div>
  );
}
