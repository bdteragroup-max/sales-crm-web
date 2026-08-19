import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import SchedulesClient from './SchedulesClient';
import prisma from '@/app/lib/db';
import { canViewAll } from "@/app/lib/roleHelper";

export const metadata: Metadata = {
  title: 'ตารางงานเซอร์วิส | Sales CRM',
};

async function getProvincesFromDb() {
  const result = await prisma.$queryRaw<{ province: string | null }[]>`
    SELECT DISTINCT "province" 
    FROM "PostalData" 
    WHERE "province" IS NOT NULL 
    ORDER BY "province" ASC
  `;
  return result.filter(r => r.province).map(r => r.province as string);
}

export default async function ServiceSchedulesPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }

  const roleStr = (user.role || '').toLowerCase();
  
  // Basic access check for service users
  const isServiceUser = roleStr === 'ช่าง' || roleStr.includes('service') || roleStr.includes('บริการ') || roleStr.includes('ช่าง') || roleStr === 'แอดมิน' || roleStr.includes('manager') || roleStr.includes('ผู้จัดการ') || roleStr.includes('หัวหน้า') || roleStr.includes('sales') || roleStr.includes('เซล') || roleStr.includes('ขาย');
  
  if (!isServiceUser && !canViewAll(roleStr)) {
    redirect('/dashboard');
  }
  
  let provinces: string[] = [];
  try {
    provinces = await getProvincesFromDb();
  } catch (error) {
    console.error("Failed to fetch provinces:", error);
  }

  const currentUser = {
    id: user.id,
    fullName: user.fullName,
    role: user.role,
    employeeId: user.employeeId
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 pb-20 md:pb-10 h-full">
      <SchedulesClient currentUser={currentUser} provinces={provinces} />
    </main>
  );
}
