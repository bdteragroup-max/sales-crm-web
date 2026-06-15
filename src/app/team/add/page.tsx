import React from 'react';
import { getUser } from '@/app/lib/dal';
import Sidebar from '@/app/components/Sidebar';
import { redirect } from 'next/navigation';
import SignupForm from './SignupForm'; // We'll move the form logic here

export const dynamic = 'force-dynamic';

export default async function AddTeamMemberPage() {
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
                        
  if (!user || !isTeamManager) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/team" userFullName={user.fullName} userId={user.id} userRole={user.role} />
      
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50 p-4 md:p-10 pb-24 md:pb-10">
        <div className="max-w-4xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">เพิ่มพนักงานใหม่</h1>
            <p className="text-gray-500 mt-2 text-sm">กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ให้กับสมาชิกในทีม</p>
          </div>
          
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <SignupForm managerName={user.fullName} />
          </div>
        </div>
      </main>
    </div>
  );
}
