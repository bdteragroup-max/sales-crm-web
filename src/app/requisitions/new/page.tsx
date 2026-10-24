import React from 'react';
import RequisitionForm from './RequisitionForm';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { Package } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'สร้างใบเบิก/ยืมของ - TeraSales',
};

export default async function NewRequisitionPage(props: {
  searchParams?: Promise<{ projectId?: string; type?: string; branch?: string }>;
}) {
  const session = await getUser();
  if (!session) return <div>Unauthorized</div>;

  const searchParams = props.searchParams ? await props.searchParams : {};

  // Fetch users for approver dropdown
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: 'asc' }
  });

  // Fetch active projects for quick selection
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      projectNumber: true,
      name: true,
      clientName: true,
      siteAddress: true,
      province: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/requisitions"
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
        >
          &larr;
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
            <Package className="text-red-600" />
            สร้างใบเบิกของงานโครงการ / เบิกยืมอุปกรณ์
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">
            กรอกข้อมูลเพื่อส่งคำขอเบิกของเข้าโครงการ หรือยืมวัสดุอุปกรณ์สำหรับสาขาและไซต์งานทั่วประเทศ
          </p>
        </div>
      </div>

      <RequisitionForm 
        users={users} 
        currentUser={session} 
        projects={projects}
        initialProjectId={searchParams.projectId}
        initialType={searchParams.type}
        initialBranch={searchParams.branch}
      />
    </div>
  );
}
