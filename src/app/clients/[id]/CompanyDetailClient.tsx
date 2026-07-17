'use client';

import React from 'react';
import { Building2, ArrowLeft, Clock, Phone, FileText, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CompanyDetailClient({ company, currentUser }: { company: any, currentUser: any }) {
  const router = useRouter();

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-10 pb-24 md:pb-10">
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-gray-500 hover:text-brand-red font-bold text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> กลับไปหน้ารวมลูกค้า
      </button>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 bg-red-50 text-brand-red rounded-full flex items-center justify-center font-black text-2xl border border-red-100">
            {company.companyName.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{company.companyName}</h1>
            <p className="text-gray-500 font-medium">Segment: {company.segment || 'ไม่มี'} | Status: {company.customerStatus || 'ไม่มี'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Clock className="text-brand-red" size={24} /> ประวัติการโต้ตอบ (Timeline)
        </h2>
        
        {company.interactions && company.interactions.length > 0 ? (
          <div className="relative border-l-2 border-red-100 ml-4 space-y-8 pb-4">
            {company.interactions.map((interaction: any) => (
              <div key={interaction.id} className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-brand-red"></div>
                <div className="mb-1 text-sm font-bold text-gray-500">
                  {new Date(interaction.occurredAt).toLocaleString('th-TH')}
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 font-black text-gray-900 mb-1">
                    {interaction.type === 'call' && <Phone size={16} className="text-blue-500" />}
                    {interaction.type === 'quotation' && <FileText size={16} className="text-green-500" />}
                    {interaction.type === 'job' && <Wrench size={16} className="text-orange-500" />}
                    {interaction.title}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{interaction.description}</p>
                  <p className="text-xs font-bold text-gray-400">โดย: {interaction.user?.fullName || 'ไม่ระบุ'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 font-bold">
            ยังไม่มีประวัติการโต้ตอบ
          </div>
        )}
      </div>
    </div>
  );
}
