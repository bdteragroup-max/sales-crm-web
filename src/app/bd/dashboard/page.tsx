import DashboardClientPage from './DashboardClientPage';
import { getUser } from '@/app/lib/dal';

export const metadata = {
  title: 'BD Dashboard - Overview',
};

export default async function DashboardPage() {
  const user = await getUser();
  return <DashboardClientPage currentUser={user} />;
}
