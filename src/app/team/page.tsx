import React from 'react';
import { getUser } from '@/app/lib/dal';
import { teraDb } from '@/app/lib/teraDb';
import { redirect } from 'next/navigation';
import { UserPlus, Mail, Phone, BadgeCheck, Building, Users } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const user = await getUser();
  
  if (!user || (user.role !== 'ผู้จัดการ' && (user.role || '').toLowerCase() !== 'sales manager' && (user.role || '').toLowerCase() !== 'marketing manager' && (user.role || '').toLowerCase() !== 'ผู้จัดการฝ่ายการตลาด' && (user.role || '').toLowerCase() !== 'ผู้จัดการการตลาด' && (user.role || '').toLowerCase() !== 'ผู้การจัดการตลาด')) {
    redirect('/dashboard');
  }

  // Fetch subordinates from TERA HR DB directly
  let subordinates: any[] = [];
  try {
    subordinates = await teraDb.employees.findMany({
      where: {
        supervisor_id: user.employeeId,
        is_active: true,
      },
      include: {
        departments: true,
        job_positions: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  } catch (err) {
    console.warn("Failed to fetch subordinates from HR database:", err);
  }

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50 p-4 md:p-10 pb-24 md:pb-10">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">จัดการทีมขาย</h1>
            <p className="text-gray-500 mt-2 text-sm">จัดการสมาชิกในทีมและสิทธิ์การเข้าใช้งานระบบ</p>
          </div>
          {/* <Link 
            href="/team/add" 
            className="flex items-center gap-2 bg-brand-red text-white px-6 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
          >
            <UserPlus size={20} />
            เพิ่มพนักงานใหม่
          </Link> */}
        </div>

        {/* Team List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subordinates.length > 0 ? (
            subordinates.map((member) => (
              <div key={member.emp_id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-brand-red font-black text-xl border border-red-100 group-hover:bg-brand-red group-hover:text-white transition-colors">
                    {member.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{member.name} {member.nickname ? `(${member.nickname})` : ''}</h3>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{member.job_positions?.title || 'พนักงาน'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <BadgeCheck size={16} className="text-red-400" />
                    <span className="font-medium">{member.emp_id}</span>
                  </div>
                  {member.phone_number && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Phone size={16} className="text-red-400" />
                      <span>{member.phone_number}</span>
                    </div>
                  )}
                  {member.departments?.name && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Building size={16} className="text-red-400" />
                      <span>{member.departments.name}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-5 border-t border-gray-50 flex justify-end">
                  <Link 
                    href={`/team/${member.emp_id}`}
                    className="text-xs font-bold text-brand-red hover:text-red-800 transition-colors"
                  >
                    ดูรายละเอียด / แก้ไข
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-900">ยังไม่มีสมาชิกในทีม</h3>
              <p className="text-sm text-gray-400 mt-1">คุณยังไม่มีลูกทีมในการดูแลภายใต้รหัสพนักงานของคุณ</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
