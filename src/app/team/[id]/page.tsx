import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import Sidebar from '@/app/components/Sidebar';
import { redirect, notFound } from 'next/navigation';
import EditMemberForm from './EditMemberForm';
import { User, BadgeCheck, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  const roleLower = (user?.role || '').toLowerCase();
  const isTeamManager = user?.role === 'ผู้จัดการ' || 
                        roleLower === 'sales manager' || 
                        roleLower === 'marketing manager' || 
                        roleLower.includes('ผู้จัดการฝ่ายการตลาด') ||
                        roleLower.includes('ผู้จัดการการตลาด') ||
                        roleLower.includes('ผู้การจัดการตลาด') ||
                        roleLower.includes('admin') ||
                        user?.role === 'Admin';
                        
  const isProjectAdmin = roleLower.includes('admin project') || roleLower.includes('project admin') || roleLower.includes('admin') || user?.role === 'Admin';

  if (!user || !isTeamManager) {
    redirect('/dashboard');
  }

  // Fetch the specific team member
  const member = await prisma.user.findUnique({
    where: { id },
    include: { employeeSale: true },
  });

  if (!member) {
    notFound();
  }

  // Security Check: Only the Manager (Team Leader) can edit their subordinates
  // Project Admins can edit anyone
  if (!isProjectAdmin && member.employeeSale?.teamLeader !== user.fullName && member.id !== user.id) {
     redirect('/team'); 
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/team" userFullName={user.fullName} userId={user.id} userRole={user.role} />
      
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50 p-4 md:p-10 pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto w-full">
          {/* Breadcrumb / Nav */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <span>จัดการทีมขาย</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">รายละเอียดพนักงาน</span>
          </div>

          {/* Profile Header Card */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-[80px] -mr-32 -mt-32 -z-0 opacity-50"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="w-24 h-24 rounded-3xl bg-red-600 flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-red-200 shrink-0">
                {member.fullName.charAt(0)}
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2 justify-center md:justify-start">
                  <h1 className="text-3xl font-black text-gray-900">{member.fullName}</h1>
                  <span className="px-3 py-1 bg-red-50 text-brand-red text-xs font-bold rounded-full border border-red-100 uppercase tracking-wider">
                    {member.role}
                  </span>
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <BadgeCheck size={16} className="text-gray-400" />
                    <span>ID: {member.employeeId}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-gray-400" />
                    <span>ตำแหน่ง: {member.employeeSale?.position || member.position || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Edit Form */}
          <div className="bg-white rounded-3xl p-8 lg:p-12 border border-gray-100 shadow-sm">
            <EditMemberForm member={JSON.parse(JSON.stringify(member))} />
          </div>

          <div className="mt-10 text-center">
            <p className="text-xs text-gray-400">
              ID พนักงาน: {member.id} &bull; ข้อมูลอัปเดตล่าสุดเมื่อ: {new Date(member.updatedAt).toLocaleString('th-TH')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
