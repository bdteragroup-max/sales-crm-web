"use client"

import React from 'react';
import { User, Phone, Tag, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

import { useRouter } from 'next/navigation';

export default function SalesLeadsClient({ leads }: { leads: any[] }) {
  const router = useRouter();
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Leads จาก Marketing</h1>
        <p className="text-gray-500 mt-1">รายการลูกค้าที่สนใจจากทีมการตลาด รอการติดต่อกลับ</p>
      </div>

      <div className="grid gap-4">
        {leads.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-gray-500">ไม่มี Lead ที่ได้รับมอบหมาย</p>
          </div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <User size={18} className="text-[#ff2301]" />
                      {lead.customerName}
                    </h3>
                    {lead.isContacted || lead.quotationId ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                        รับเรื่องแล้ว (ติดต่อแล้ว)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-amber-100 text-amber-700 border border-amber-200">
                        รอการติดต่อ
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    {lead.phoneNumber && (
                      <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md">
                        <Phone size={14} />
                        {lead.phoneNumber}
                      </span>
                    )}
                    {(lead.productType || lead.productOfInterest) && (
                      <span className="flex items-center gap-1 bg-red-50 text-[#ff2301] px-2 py-1 rounded-md font-medium">
                        <Tag size={14} />
                        {lead.productType} {lead.productOfInterest}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 flex items-center justify-end gap-1">
                    <Clock size={12} />
                    {lead.forwardedAt ? format(new Date(lead.forwardedAt), 'dd MMM yyyy HH:mm', { locale: th }) : ''}
                  </span>
                  <span className="text-xs text-gray-500 mt-1 block">
                    ส่งโดย: {lead.createdBy?.fullName || '-'}
                  </span>
                </div>
              </div>

              {lead.conversationContent && (
                <div className="mt-4 p-4 bg-orange-50 rounded-xl">
                  <h4 className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <MessageSquare size={12} />
                    บันทึกการสนทนา
                  </h4>
                  <p className="text-sm text-orange-900 whitespace-pre-wrap">{lead.conversationContent}</p>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={() => router.push(`/telesales?tab=new&marketingLeadId=${lead.id}&customerName=${encodeURIComponent(lead.customerName || '')}&phone=${encodeURIComponent(lead.phoneNumber || '')}`)}
                  className="px-4 py-2 bg-orange-100 text-orange-700 border border-orange-200 text-sm font-bold rounded-xl hover:bg-orange-200 transition-colors"
                >
                  บันทึกการโทร (Telesales)
                </button>
                <button 
                  onClick={() => router.push(`/sales/requirements?marketingLeadId=${lead.id}&customerName=${encodeURIComponent(lead.customerName || '')}&phone=${encodeURIComponent(lead.phoneNumber || '')}`)}
                  className="px-4 py-2 bg-[#ff2301] text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-md shadow-red-200 transition-colors"
                >
                  ออกใบเสนอราคา
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
