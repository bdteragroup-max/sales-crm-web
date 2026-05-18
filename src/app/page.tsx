import React from 'react';
import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import LoginPage from './components/LoginPage';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getUser();
  if (user) redirect('/dashboard');

  return <LoginPage />;
}
