import React from 'react';
import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import KanbanBoardClient from './KanbanBoardClient';

export default async function BDKanbanPage() {
  const session = await getUser();
  if (!session) redirect('/login');
  const roleStr = (session.role || '').toLowerCase();
  const isBdOrExec = ['business development', 'bd', 'พัฒนาธุรกิจ', 'executive', 'ผู้บริหาร', 'admin'].some(r => roleStr.includes(r));
  
  if (!isBdOrExec) {
    redirect('/dashboard');
  }

  return <KanbanBoardClient currentUser={session} />;
}
