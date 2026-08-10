import { getUser } from '@/app/lib/dal';
import ReportsClientPage from './ReportsClientPage';
import { redirect } from 'next/navigation';

export default async function BDReportsPage() {
  const user = await getUser();
  if (!user) {
    redirect('/api/auth/logout');
  }

  // Pass user context so the client knows if it should show the Team Overview & Member Selector
  // Fix role matching based on actual roles in DB (SUPER_ADMIN, Business Development, ผู้จัดการ, etc)
  const isExecutive = ['SUPER_ADMIN', 'ผู้จัดการ'].includes(user.role) || user.role?.toLowerCase().includes('mgr') || user.role?.toLowerCase().includes('manager');
  const isBDLead = user.role === 'Business Development';
  const canViewTeam = isExecutive || isBDLead;
  return (
    <ReportsClientPage 
      currentUserId={user.id} 
      canViewTeam={canViewTeam} 
    />
  );
}
