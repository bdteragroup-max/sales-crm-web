import React from 'react';
import { getFacilityRepairs } from '@/app/actions/facility-repairs';
import prisma from '@/app/lib/db';
import { notFound } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import FacilityRepairActions from '../components/FacilityRepairActions';

export default async function FacilityRepairDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const repair = await prisma.facilityRepairRequest.findUnique({
    where: { id: params.id },
    include: { logs: { include: { user: true }, orderBy: { createdAt: 'desc' } }, reporter: true, assignee: true }
  });

  if (!repair) notFound();

  const user = await getUser();
  const roleStr = (user?.role || '').toLowerCase();
  const isTechnician = roleStr.includes('technician') || roleStr.includes('ช่าง') || roleStr.includes('service') || roleStr.includes('บริการ') || roleStr.includes('ซ่อม') || roleStr === 'อื่นๆ';
  const isAdmin = roleStr.includes('admin') || roleStr === 'super_admin';

  return (
    <div className="p-4 sm:p-6 md:p-10 lg:p-12 max-w-7xl mx-auto w-full">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">รายละเอียดคำร้องแจ้งซ่อม: <span className="text-red-600 block sm:inline">{repair.requestNumber}</span></h1>
        {user && (
          <FacilityRepairActions 
            repair={{
              id: repair.id,
              status: repair.status,
              assigneeId: repair.assigneeId
            }} 
            currentUser={{
              id: user.id,
              role: user.role || ''
            }} 
            isTechnician={isTechnician} 
            isAdmin={isAdmin} 
          />
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 md:p-8 shadow-sm border border-gray-100 rounded-xl">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">ข้อมูลเบื้องต้น (Information)</h2>
          <div className="space-y-3 text-gray-700">
            <p><strong className="text-gray-900">อุปกรณ์/ปัญหา:</strong> {repair.equipmentName}</p>
            <p><strong className="text-gray-900">สถานที่:</strong> {repair.location}</p>
            <p><strong className="text-gray-900">สถานะ:</strong> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{repair.status}</span></p>
            <p><strong className="text-gray-900">รายละเอียดเพิ่มเติม:</strong> <span className="whitespace-pre-wrap">{repair.issueDetail}</span></p>
          </div>
          {repair.photoUrl && <img src={repair.photoUrl} alt="รูปภาพประกอบ" className="mt-6 max-w-full h-auto rounded-lg border border-gray-200" />}
        </div>
        
        <div className="bg-white p-6 md:p-8 shadow-sm border border-gray-100 rounded-xl">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">ประวัติการดำเนินการ (Activity Log)</h2>
          <ul className="space-y-5">
            {repair.logs.map((log) => (
              <li key={log.id} className="text-sm border-l-2 border-red-200 pl-4 py-1">
                <span className="font-semibold text-gray-900">{log.user?.fullName || 'ระบบ'}</span> 
                <span className="text-gray-500 ml-2 text-xs">{new Date(log.createdAt).toLocaleString('th-TH')}</span>
                <div className="text-gray-600 mt-1">
                  <span className="font-medium">{log.action}</span> - {log.details}
                </div>
              </li>
            ))}
            {repair.logs.length === 0 && (
              <li className="text-sm text-gray-500 italic">ยังไม่มีประวัติการดำเนินการ</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}