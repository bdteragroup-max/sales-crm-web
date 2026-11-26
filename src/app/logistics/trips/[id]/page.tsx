export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLogisticsTripById } from '@/app/actions/logistics';
import TripDetailClientPage from './TripDetailClientPage';

export default async function LogisticsTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { permissions, trip } = await getLogisticsTripById(id);

  if (!permissions) {
    redirect('/login');
  }

  if (!permissions.canAccess || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-3 shadow-sm">
          <h1 className="text-lg font-extrabold text-slate-900">
            ไม่พบข้อมูลทริปวิ่งรถ หรือไม่มีสิทธิ์เข้าถึง
          </h1>
          <Link
            href="/logistics"
            className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold"
          >
            กลับศูนย์จัดการขนส่ง
          </Link>
        </div>
      </div>
    );
  }

  return <TripDetailClientPage initialTrip={trip} permissions={permissions} />;
}
