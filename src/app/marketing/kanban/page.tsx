export const dynamic = 'force-dynamic';
import React from 'react';
import KanbanBoardClient from './KanbanBoardClient';
import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';

export default async function KanbanPage() {
  const session = await getUser();

  if (!session) {
    redirect('/login');
  }

  // Marketing roles, managers, or service
  const roleStr = (session.role || '').toUpperCase();
  const allowedRoles = ["MARKETING", "SERVICE", "SERVICE_ENGINEER", "SERVICE_MGR", "MANAGER", "SUPER_ADMIN", "PROJECT", "การตลาด", "บริการ", "ผู้จัดการ", "โปรเจค", "โครงการ"];
  const hasAccess = allowedRoles.some(r => roleStr.includes(r));

  if (!hasAccess) {
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
