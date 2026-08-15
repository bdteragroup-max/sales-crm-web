import { redirect } from 'next/navigation'
import BdTvDisplayClient from './BdTvDisplayClient'
import { getUser } from '@/app/lib/dal'

export const dynamic = 'force-dynamic' // Ensure page isn't statically generated

export default async function BdTicketsDisplayPage() {
  const user = await getUser();
  
  if (!user || (!user.role.includes('Business Development') && user.role !== 'BD Intern')) {
    redirect('/login');
  }

  return <BdTvDisplayClient />
}
