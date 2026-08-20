export const dynamic = 'force-dynamic';
import React from 'react';
import { getFacilityRepairs } from '@/app/actions/facility-repairs';
import { getUser } from '@/app/lib/dal';
import Link from 'next/link';

export default async function TechnicianFacilityRepairsPage() {
  const user = await getUser();
  const roleStr = (user?.role || '').toLowerCase();
  const isTechnician = roleStr.includes('technician') || roleStr.includes('ช่าง') || roleStr.includes('service') || roleStr.includes('บริการ') || roleStr.includes('ซ่อม') || roleStr === 'อื่นๆ';
  const isAdmin = roleStr.includes('admin') || roleStr === 'super_admin';

  if (!user || (!isTechnician && !isAdmin)) {
    return <div className="p-6 text-red-600">ไม่มีสิทธิ์เข้าถึง</div>;
  }

  const allRepairs = await getFacilityRepairs();
  const unassignedRepairs = allRepairs.filter((r: any) => r.status === 'REPORTED');
  const myRepairs = allRepairs.filter((r: any) => r.assigneeId === user.id && r.status !== 'COMPLETED');

  return (
    <div className="p-4 sm:p-6 md:p-10 lg:p-12 max-w-7xl mx-auto w-full">
      <h1 className="text-xl sm:text-2xl font-bold mb-6 text-gray-900">แดชบอร์ดช่าง: แจ้งซ่อมสถานที่ (Facility Repairs)</h1>

      <h2 className="text-lg sm:text-xl font-semibold mt-8 mb-4 text-gray-800">งานที่กำลังดำเนินการของฉัน</h2>
      
      {/* Mobile view (Cards) */}
      <div className="md:hidden grid grid-cols-1 gap-4 mb-8">
        {myRepairs.map((r: any) => (
          <div key={r.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-bold text-gray-900">{r.requestNumber}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{r.status}</span>
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-medium">อุปกรณ์/ปัญหา:</span> {r.equipmentName}
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-medium">สถานที่:</span> {r.location}
            </div>
            <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-50">
              <Link href={`/facility-repairs/${r.id}`} className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors">ดูรายละเอียด</Link>
              <Link href={`/facility-repairs/${r.id}`} className="text-sm text-red-700 font-medium bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors">อัปเดตสถานะ</Link>
            </div>
          </div>
        ))}
        {myRepairs.length === 0 && (
          <div className="text-center text-gray-500 py-4 bg-white rounded-lg shadow-sm border border-gray-100">ไม่มีงานที่กำลังดำเนินการ</div>
        )}
      </div>

      {/* Desktop view (Table) */}
      <div className="hidden md:block bg-white shadow rounded-lg overflow-x-auto mb-8 border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลขที่คำร้อง</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">อุปกรณ์/ปัญหา</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานที่</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {myRepairs.map((r: any) => (
              <tr key={r.id}>
                <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium hover:text-red-800 transition-colors">
                  <Link href={`/facility-repairs/${r.id}`}>{r.requestNumber}</Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{r.equipmentName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{r.location}</td>
                <td className="px-6 py-4 whitespace-nowrap">{r.status}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/technician/facility-repairs/${r.id}/edit`} className="text-red-600 hover:text-red-800 font-medium underline underline-offset-2 transition-colors">
                    อัปเดตสถานะ
                  </Link>
                </td>
              </tr>
            ))}
            {myRepairs.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">ไม่มีงานที่กำลังดำเนินการ</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">คำร้องที่รอการรับผิดชอบ</h2>

      {/* Mobile view (Cards) */}
      <div className="md:hidden grid grid-cols-1 gap-4 mb-8">
        {unassignedRepairs.map((r: any) => (
          <div key={r.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-bold text-gray-900">{r.requestNumber}</span>
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-medium">อุปกรณ์/ปัญหา:</span> {r.equipmentName}
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-medium">สถานที่:</span> {r.location}
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-medium">ผู้แจ้ง:</span> {r.reporterName || r.reporter?.fullName || 'N/A'}
            </div>
            <div className="flex justify-end items-center mt-2 pt-3 border-t border-gray-50">
              <Link href={`/facility-repairs/${r.id}`} className="text-sm text-red-700 font-medium bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors">ดูรายละเอียด / รับงาน</Link>
            </div>
          </div>
        ))}
        {unassignedRepairs.length === 0 && (
          <div className="text-center text-gray-500 py-4 bg-white rounded-lg shadow-sm border border-gray-100">ไม่มีคำร้องที่รอดำเนินการ</div>
        )}
      </div>

      {/* Desktop view (Table) */}
      <div className="hidden md:block bg-white shadow rounded-lg overflow-x-auto border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลขที่คำร้อง</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">อุปกรณ์/ปัญหา</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานที่</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้แจ้ง</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {unassignedRepairs.map((r: any) => (
              <tr key={r.id}>
                <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium hover:text-red-800 transition-colors">
                  <Link href={`/facility-repairs/${r.id}`}>{r.requestNumber}</Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{r.equipmentName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{r.location}</td>
                <td className="px-6 py-4 whitespace-nowrap">{r.reporterName || r.reporter?.fullName || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <Link href={`/facility-repairs/${r.id}`} className="text-red-600 hover:text-red-800 font-medium underline underline-offset-2 transition-colors">
                     ดูรายละเอียด / รับงาน
                   </Link>
                </td>
              </tr>
            ))}
            {unassignedRepairs.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">ไม่มีคำร้องที่รอดำเนินการ</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
