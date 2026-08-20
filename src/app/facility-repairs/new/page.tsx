import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getUser } from '@/app/lib/dal';
import { getFacilityRepairs } from '@/app/actions/facility-repairs';
import FacilityRepairForm from './FacilityRepairForm';

export default async function NewFacilityRepairPage() {
  const user = await getUser();
  
  // Fetch user's repair history if logged in
  let userRepairs: any[] = [];
  if (user?.id) {
    userRepairs = await getFacilityRepairs({ reporterId: user.id });
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 lg:p-12 max-w-7xl mx-auto w-full">
      <div className="mb-6 flex items-center space-x-4 max-w-4xl mx-auto">
        <Link href="/" className="text-gray-500 hover:text-gray-700 bg-white p-2 rounded-full shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">แจ้งซ่อมสถานที่ (Report Facility Repair)</h1>
          <p className="text-gray-500 text-sm mt-1">แจ้งปัญหาสถานที่ อุปกรณ์สำนักงาน หรือปัญหาทั่วไปภายในบริษัท</p>
        </div>
      </div>

      <FacilityRepairForm />

      {user?.id && (
        <div className="max-w-4xl mx-auto mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">ประวัติการแจ้งซ่อมของคุณ (Your Repair History)</h2>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">เลขที่คำร้อง</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">อุปกรณ์/ปัญหา</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">สถานที่</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userRepairs.map((r: any) => (
                    <tr key={r.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium hover:text-red-800 transition-colors">
                        <Link href={`/facility-repairs/${r.id}`}>{r.requestNumber}</Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{r.equipmentName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{r.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${r.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                            r.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' : 
                            r.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/facility-repairs/${r.id}`} className="text-red-600 hover:text-red-800 font-medium underline underline-offset-2 transition-colors">
                          ดูรายละเอียด
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {userRepairs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        คุณยังไม่มีประวัติการแจ้งซ่อม
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {userRepairs.map((r: any) => (
                <div key={r.id} className="p-4 flex flex-col space-y-2 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <Link href={`/facility-repairs/${r.id}`} className="font-bold text-red-600 hover:text-red-800">{r.requestNumber}</Link>
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${r.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                            r.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' : 
                            r.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">อุปกรณ์/ปัญหา:</span> {r.equipmentName}
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">สถานที่:</span> {r.location}
                  </div>
                  <div className="pt-2">
                    <Link href={`/facility-repairs/${r.id}`} className="text-sm text-red-600 font-medium">
                      ดูรายละเอียด &rarr;
                    </Link>
                  </div>
                </div>
              ))}
              {userRepairs.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  คุณยังไม่มีประวัติการแจ้งซ่อม
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
