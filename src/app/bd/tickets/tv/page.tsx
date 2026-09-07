import { redirect } from 'next/navigation'
import BdTvDisplayClient from './BdTvDisplayClient'
import { getUser } from '@/app/lib/dal'

export const dynamic = 'force-dynamic' // Ensure page isn't statically generated

export default async function BdTicketsDisplayPage() {
  const user = await getUser();
  
  const isExecutive = ['SUPER_ADMIN', 'ผู้จัดการ', 'Admin'].includes(user?.role || '') || user?.role?.toLowerCase().includes('mgr') || user?.role?.toLowerCase().includes('manager');
  const isBD = user?.role?.includes('Business Development') || user?.role === 'BD Intern';

  if (!user || (!isBD && !isExecutive)) {
    redirect('/login');
  }

  return <BdTvDisplayClient />
}
