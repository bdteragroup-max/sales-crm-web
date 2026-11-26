export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifySession } from '@/app/lib/dal';
import { getLogisticsWorkspaceData } from '@/app/actions/logistics';
import LogisticsWorkspaceClient from './components/LogisticsWorkspaceClient';

export default async function LogisticsPage() {
  const session = await verifySession();
  if (!session.isAuth) {
    redirect('/login');
  }

  let workspace = null;
  try {
    workspace = await getLogisticsWorkspaceData();
  } catch (err) {
    console.error('[LogisticsPage] failed to load workspace:', err);
  }

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-3 shadow-sm">
          <h1 className="text-lg font-extrabold text-slate-900">
            ไม่สามารถเชื่อมต่อฐานข้อมูลได้ชั่วคราว
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            ระบบกำลังรอการตอบสนองจากฐานข้อมูล กรุณารอสักครู่แล้วกดโหลดหน้าใหม่
          </p>
          <Link
            href="/logistics"
            className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors"
          >
            โหลดหน้าใหม่อีกครั้ง
          </Link>
        </div>
      </div>
    );
  }

  if (!workspace.permissions.canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-3 shadow-sm">
          <h1 className="text-lg font-extrabold text-slate-900">
            เฉพาะฝ่ายขนส่ง สโตร์ จัดซื้อ และผู้บริหาร
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            บัญชีของคุณไม่มีสิทธิ์เข้าใช้งานศูนย์จัดการขนส่ง &amp; คิวรถ (Logistics)
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#ff2301] hover:bg-red-600 text-white text-xs font-bold transition-colors"
          >
            กลับไปหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return <LogisticsWorkspaceClient initialData={workspace} />;
}
