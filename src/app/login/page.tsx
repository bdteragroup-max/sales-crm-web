import React from 'react';
import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import LoginPage from '@/app/components/LoginPage';

export const dynamic = 'force-dynamic';

export default async function LoginRoute() {
  const user = await getUser();
  if (user) redirect('/dashboard');

  return <LoginPage />;
}
