export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import { getContentPlanningWorkspace } from '@/app/actions/contentPlanning';
import ContentPlanningClient from '../components/content-planning/ContentPlanningClient';

export const metadata = {
  title: 'วางแผนคอนเทนต์ (Content Planning) | TERA Group',
  description: 'ระบบวางแผนการโพสต์คอนเทนต์รายเดือนแยกตามบุคคลสำหรับทีมการตลาด',
};

export default async function ContentPlanningPage() {
  const sessionUser = await getUser();
  if (!sessionUser) {
    redirect('/login');
  }

  const workspace = await getContentPlanningWorkspace();

  if (!workspace.permissions?.canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-3 shadow-sm">
          <h1 className="text-lg font-extrabold text-slate-900">
            เฉพาะทีมการตลาดและผู้บริหาร
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            บัญชีของคุณไม่มีสิทธิ์เข้าใช้งานหน้าวางแผนคอนเทนต์ (Content Planning)
          </p>
          <Link
            href="/marketing-board"
            className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#ff2301] hover:bg-red-600 text-white text-xs font-bold transition-colors"
          >
            กลับไปกระดานการตลาด
          </Link>
        </div>
      </div>
    );
  }

  return <ContentPlanningClient initialData={workspace} />;
}
