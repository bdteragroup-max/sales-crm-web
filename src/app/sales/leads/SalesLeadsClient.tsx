"use client"

import React, { useState, useMemo } from 'react';
import { User, Phone, Tag, Clock, MessageSquare, PlusCircle, MapPin, Search, RotateCcw, UserCheck, Info } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { claimLead } from '@/app/actions/marketing';
import ProvinceCombobox from '@/app/marketing/components/ProvinceCombobox';
import {
  matchesProvinceFilter,
  toProvinceFilterOptions
} from '@/app/marketing/constants/thaiProvinces';

import { useRouter } from 'next/navigation';

export default function SalesLeadsClient({
  leads,
  currentUserId,
  canViewAllLeads = false
}: {
  leads: any[];
  currentUserId: string;
  canViewAllLeads?: boolean;
}) {
  const router = useRouter();
  const [isClaiming, setIsClaiming] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [assignmentScope, setAssignmentScope] = useState<'all' | 'mine' | 'unassigned' | 'assigned'>('all');

  const provinceOptions = useMemo(() => toProvinceFilterOptions(leads), [leads]);

  const scopeCounts = useMemo(() => {
    let mine = 0;
    let unassigned = 0;
    let assigned = 0;
    for (const l of leads) {
      if (l.assignedToId === currentUserId) mine++;
      if (!l.assignedToId) unassigned++;
      else assigned++;
    }
    return { all: leads.length, mine, unassigned, assigned };
  }, [leads, currentUserId]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (assignmentScope === 'mine' && lead.assignedToId !== currentUserId) return false;
      if (assignmentScope === 'unassigned' && lead.assignedToId !== null) return false;
      if (assignmentScope === 'assigned' && !lead.assignedToId) return false;

      if (!matchesProvinceFilter(lead.province, selectedProvince)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = lead.customerName?.toLowerCase().includes(q);
        const matchPhone = lead.phoneNumber?.toLowerCase().includes(q);
        const matchProvince =
          lead.province?.toLowerCase().includes(q) ||
          lead.district?.toLowerCase().includes(q);
        const matchProduct =
          lead.productType?.toLowerCase().includes(q) ||
          lead.productOfInterest?.toLowerCase().includes(q);
        const matchAssignee =
          lead.assignedTo?.fullName?.toLowerCase().includes(q) ||
          lead.quotation?.salesperson?.fullName?.toLowerCase().includes(q) ||
          lead.createdBy?.fullName?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchProvince && !matchProduct && !matchAssignee) {
          return false;
        }
      }
      return true;
    });
  }, [leads, assignmentScope, currentUserId, searchQuery, selectedProvince]);

  const handleClaim = async (leadId: string) => {
    setIsClaiming(leadId);
    const res = await claimLead(leadId, currentUserId);
    setIsClaiming(null);
    if (!res.success) {
       alert(res.error || 'ไม่สามารถรับเรื่องได้');
    } else {
       router.refresh();
    }
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads จาก Marketing</h1>
          <p className="text-gray-500 mt-1">รายการลูกค้าที่สนใจจากทีมการตลาด รอการติดต่อกลับ</p>
        </div>
        {!canViewAllLeads && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <Info size={14} className="shrink-0 text-amber-600" />
            <span>แสดงเฉพาะ Lead ของคุณ และรายการที่รอรับผิดชอบ ({leads.length} รายการ)</span>
          </div>
        )}
      </div>

      {/* Filter Console: Search & Province (for Branch Callbacks) */}
      <div className="mb-6 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, จังหวัด, สินค้า, เซลส์ผู้ดูแล..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 sm:flex-initial">
              <ProvinceCombobox
                value={selectedProvince}
                onChange={setSelectedProvince}
                options={provinceOptions}
                emptyLabel="ทุกจังหวัด (All Provinces)"
                totalCount={leads.length}
                variant="filter"
              />
            </div>

            {(searchQuery || selectedProvince || assignmentScope !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedProvince('');
                  setAssignmentScope('all');
                }}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors inline-flex items-center gap-1"
              >
                <RotateCcw size={13} />
                <span>ล้างตัวกรอง</span>
              </button>
            )}

            <span className="text-xs font-bold text-gray-500 px-2 whitespace-nowrap">
              แสดง {filteredLeads.length} / {leads.length}
            </span>
          </div>
        </div>

        {/* Assignment Scope Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-gray-100 text-xs">
          <button
            type="button"
            onClick={() => setAssignmentScope('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              assignmentScope === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ทั้งหมด ({scopeCounts.all})
          </button>
          <button
            type="button"
            onClick={() => setAssignmentScope('mine')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              assignmentScope === 'mine'
                ? 'bg-[#ff2301] text-white shadow-xs'
                : 'bg-red-50 text-[#ff2301] hover:bg-red-100 border border-red-100'
            }`}
          >
            มอบหมายให้ฉัน ({scopeCounts.mine})
          </button>
          <button
            type="button"
            onClick={() => setAssignmentScope('unassigned')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              assignmentScope === 'unassigned'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            รอรับเรื่อง ({scopeCounts.unassigned})
          </button>
          {canViewAllLeads && (
            <button
              type="button"
              onClick={() => setAssignmentScope('assigned')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                assignmentScope === 'assigned'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
              }`}
            >
              มอบหมายแล้ว ({scopeCounts.assigned})
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-gray-500">
              {searchQuery || selectedProvince || assignmentScope !== 'all'
                ? 'ไม่พบ Lead ที่ตรงกับตัวกรองที่เลือก'
                : 'ไม่มี Lead ที่ได้รับมอบหมาย'}
            </p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-4">
                <div className="w-full sm:w-auto">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                      <User size={18} className="text-[#ff2301]" />
                      {lead.customerName}
                    </h3>
                    {lead.isContacted || lead.quotationId ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                        รับเรื่องแล้ว
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-amber-100 text-amber-700 border border-amber-200">
                        รอการติดต่อ
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 sm:mt-2 text-xs sm:text-sm text-gray-600">
                    {lead.phoneNumber && (
                      <span className="flex items-center gap-1 bg-gray-50 px-2.5 py-1.5 sm:py-1 rounded-md font-semibold">
                        <Phone size={14} />
                        {lead.phoneNumber}
                      </span>
                    )}
                    {lead.province ? (
                      <span className="flex items-center gap-1 bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-1.5 sm:py-1 rounded-md font-bold">
                        <MapPin size={14} className="text-sky-600 shrink-0" />
                        <span>
                          จ.{lead.province}
                          {lead.district ? ` (${lead.district})` : ''}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-gray-50 text-gray-400 border border-gray-200/80 px-2 py-1.5 sm:py-1 rounded-md text-xs">
                        <MapPin size={13} className="shrink-0" />
                        <span>ไม่ระบุจังหวัด</span>
                      </span>
                    )}
                    {(lead.productType || lead.productOfInterest) && (
                      <span className="flex items-center gap-1 bg-red-50 text-[#ff2301] px-2.5 py-1.5 sm:py-1 rounded-md font-medium">
                        <Tag size={14} />
                        {lead.productType} {lead.productOfInterest}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full sm:w-auto sm:text-right border-t border-gray-100 sm:border-0 pt-3 sm:pt-0 mt-2 sm:mt-0 space-y-1">
                  <span className="text-xs text-gray-400 flex items-center sm:justify-end gap-1">
                    <Clock size={12} />
                    {lead.forwardedAt || lead.createdAt
                      ? format(new Date(lead.forwardedAt || lead.createdAt), 'dd MMM yyyy HH:mm', { locale: th })
                      : ''}
                  </span>
                  <div className="flex flex-wrap sm:justify-end gap-1.5">
                    <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-md inline-block">
                      การตลาด (Marketer): {lead.createdBy?.fullName || '-'}
                    </span>
                    {lead.assignedTo?.fullName || lead.quotation?.salesperson?.fullName ? (
                      <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md inline-flex items-center gap-1">
                        <UserCheck size={12} />
                        ผู้ดูแล: {lead.assignedTo?.fullName || lead.quotation?.salesperson?.fullName}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-1 rounded-md inline-block">
                        รอรับผิดชอบ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {lead.conversationContent && (
                <div className="mt-4 p-3 sm:p-4 bg-orange-50 rounded-xl">
                  <h4 className="text-[10px] sm:text-xs font-bold text-orange-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <MessageSquare size={12} />
                    บันทึกการสนทนา
                  </h4>
                  <p className="text-xs sm:text-sm text-orange-900 whitespace-pre-wrap">{lead.conversationContent}</p>
                </div>
              )}

              <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                {lead.assignedToId === null ? (
                  <button 
                    onClick={() => handleClaim(lead.id)}
                    disabled={isClaiming === lead.id}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <PlusCircle size={16} />
                    {isClaiming === lead.id ? 'กำลังรับเรื่อง...' : 'รับผิดชอบ Lead นี้'}
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => router.push(`/telesales?tab=new&marketingLeadId=${lead.id}&customerName=${encodeURIComponent(lead.customerName || '')}&phone=${encodeURIComponent(lead.phoneNumber || '')}`)}
                      className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-orange-100 text-orange-700 border border-orange-200 text-sm font-bold rounded-xl hover:bg-orange-200 transition-colors"
                    >
                      บันทึกการโทร (Telesales)
                    </button>
                    <button 
                      onClick={() => router.push(`/sales/requirements?marketingLeadId=${lead.id}&customerName=${encodeURIComponent(lead.customerName || '')}&phone=${encodeURIComponent(lead.phoneNumber || '')}`)}
                      className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#ff2301] text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-md shadow-red-200 transition-colors"
                    >
                      ออกใบเสนอราคา
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
