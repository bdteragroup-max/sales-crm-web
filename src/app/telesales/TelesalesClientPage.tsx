"use client";

import React, { useState } from 'react';
import { FileText, Plus, Search, Edit2, FileSpreadsheet, PhoneCall, CheckCircle2, Clock } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import NewTelesaleForm from './components/NewTelesaleForm';
import TelesaleBulkUploadModal from './components/TelesaleBulkUploadModal';

interface TelesalesClientPageProps {
  userFullName?: string;
  initialRecords?: any[];
  totalCount?: number;
  currentPage?: number;
  limit?: number;
  todayCallsCount?: number;
  todayInterestedCount?: number;
  todayCallbacksCount?: number;
}

export default function TelesalesClientPage({ 
  userFullName, 
  initialRecords = [],
  totalCount = 0,
  currentPage = 1,
  limit = 10,
  todayCallsCount = 0,
  todayInterestedCount = 0,
  todayCallbacksCount = 0
}: TelesalesClientPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get('tab') || 'list') as 'new' | 'list' | 'callbacks';
  const searchTerm = searchParams.get('search') || '';

  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Sync search input with search param changes
  React.useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  // Debounced Search Logic
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (localSearch.trim()) {
        params.set('search', localSearch.trim());
      } else {
        params.delete('search');
      }
      params.set('page', '1'); // Reset to page 1 on search
      router.push(`${pathname}?${params.toString()}`);
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [localSearch]);

  const handleTabChange = (tab: 'new' | 'list' | 'callbacks') => {
    setEditingRecord(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    params.set('page', '1'); // Reset page when tab changes
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const totalPages = Math.ceil(totalCount / limit);
    if (newPage < 1 || newPage > totalPages) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'new');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCreateNew = () => {
    setEditingRecord(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'new');
    router.push(`${pathname}?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="h-full flex flex-col space-y-6">
      
      {/* ── Top Header Bar ── */}
      <header className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center shadow-lg shadow-red-200">
            <PhoneCall size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">บันทึกเทเลเซลล์</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Telesales Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <FileSpreadsheet size={15} className="text-emerald-500" />
            นำเข้า Excel
          </button>
        </div>
      </header>

      {/* ── KPI Summary Strip (list tab only) ── */}
      {activeTab === 'list' && (
        <div className="shrink-0 grid grid-cols-4 border-b border-gray-100">
          {[
            { label: 'โทรวันนี้',        value: todayCallsCount,             icon: <PhoneCall size={14} />, color: 'text-gray-400', bg: 'bg-gray-50' },
            { label: 'นัดหมายสำเร็จ',    value: todayInterestedCount,        icon: <CheckCircle2 size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'นัดโทรกลับวันนี้', value: todayCallbacksCount,         icon: <Clock size={14} />, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'รายการที่พบ',      value: totalCount,                  icon: <FileText size={14} />, color: 'text-brand-red', bg: 'bg-red-50' },
          ].map(k => (
            <div key={k.label} className={`flex items-center gap-3 px-6 py-4 ${k.bg} border-r border-gray-100 last:border-0`}>
              <span className={k.color}>{k.icon}</span>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{k.label}</p>
                <p className={`text-lg font-black ${k.color}`}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="shrink-0 flex items-center gap-1 border-b border-gray-200">
        {[
          { id: 'new' as const, label: editingRecord ? 'แก้ไขข้อมูล' : 'บันทึกใหม่', icon: <Plus size={14} />, action: handleCreateNew },
          { id: 'list' as const, label: 'รายการบันทึก', icon: <FileText size={14} />, action: () => handleTabChange('list') },
          { id: 'callbacks' as const, label: 'นัดโทรกลับ', icon: <PhoneCall size={14} />, action: () => handleTabChange('callbacks') },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={tab.action}
            className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 transition-all ${
              activeTab === tab.id
                ? 'text-brand-red border-brand-red bg-red-50/50'
                : 'text-gray-400 border-transparent hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'new' && (
          <div className="p-8">
            <div className="max-w-4xl mx-auto">
              <NewTelesaleForm 
                userFullName={userFullName} 
                branch="สำนักงานใหญ่" 
                initialData={editingRecord}
                onSuccess={() => {
                  setEditingRecord(null);
                  handleTabChange('list');
                }}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'list' && (
          <div className="p-8 space-y-6">
            <div className="relative w-full max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาตามชื่อบริษัท หรือ เซลล์..."
                className="w-full pl-9 pr-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red placeholder-gray-300 transition-all"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">วันที่โทร</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">บริษัท / เซลล์</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">สถานะ</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">ผลลัพธ์</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">นัดโทรกลับ</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {initialRecords.length > 0 ? (
                    initialRecords.map((record: any) => (
                      <tr key={record.id} className="group hover:bg-gray-50/60 transition-colors">
                        <td className="py-4 px-5 text-[11px] font-bold text-gray-400 whitespace-nowrap">
                          {record.callDate ? new Date(record.callDate).toLocaleDateString('th-TH') : '-'}
                        </td>
                        <td className="py-4 px-5">
                          <p className="text-xs font-bold text-gray-900 leading-tight">{record.company?.companyName || '-'}</p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">{record.user?.fullName || '-'}</p>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            record.callStatus === 'รับสาย' ? 'bg-red-50 text-brand-red' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {record.callStatus || '-'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            record.callOutcome === 'สนใจ' || record.callOutcome === 'นัดหมายสำเร็จ' 
                              ? 'bg-emerald-500 text-white' 
                              : record.callOutcome === 'ไม่สนใจ' ? 'bg-gray-100 text-gray-400' : 'bg-brand-red text-white'
                          }`}>
                            {record.callOutcome || '-'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-brand-red font-black text-[11px]">
                          {record.callbackAt ? new Date(record.callbackAt).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <button 
                            onClick={() => handleEdit(record)}
                            className="p-2 text-gray-300 hover:text-brand-red hover:bg-red-50 rounded-xl transition-all group-hover:text-gray-500"
                            title="แก้ไข"
                          >
                            <Edit2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-300">
                          <Search size={36} strokeWidth={1} />
                          <p className="text-xs font-bold uppercase tracking-widest">
                            {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีประวัติการโทร'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-black text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all active:scale-95"
                  >
                    ก่อนหน้า
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-black text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all active:scale-95"
                  >
                    ถัดไป
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-sans">
                      แสดงรายการที่ <span className="font-bold text-gray-800">{Math.min((currentPage - 1) * limit + 1, totalCount)}</span> ถึง{' '}
                      <span className="font-bold text-gray-800">{Math.min(currentPage * limit, totalCount)}</span> จากทั้งหมด{' '}
                      <span className="font-bold text-gray-800">{totalCount}</span> รายการ
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-xl gap-1.5 font-sans" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-xl px-2.5 py-2 text-gray-400 hover:bg-red-50 hover:text-brand-red disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all active:scale-95"
                      >
                        <span className="transform rotate-180 block">&#x276F;</span>
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        if (totalPages > 7 && p !== 1 && p !== totalPages && Math.abs(p - currentPage) > 1) {
                          if (p === 2 && currentPage > 3) {
                            return <span key="dots-start" className="relative inline-flex items-center px-2 text-gray-400 font-bold">...</span>;
                          }
                          if (p === totalPages - 1 && currentPage < totalPages - 2) {
                            return <span key="dots-end" className="relative inline-flex items-center px-2 text-gray-400 font-bold">...</span>;
                          }
                          return null;
                        }

                        return (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            className={`relative inline-flex items-center rounded-xl px-3.5 py-1.5 text-sm font-bold transition-all active:scale-95 ${
                              p === currentPage
                                ? 'z-10 bg-brand-red text-white shadow-md shadow-red-200'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-xl px-2.5 py-2 text-gray-400 hover:bg-red-50 hover:text-brand-red disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all active:scale-95"
                      >
                        <span>&#x276F;</span>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'callbacks' && (
          <div className="p-8 space-y-6">
            <div className="relative w-full max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาตามชื่อบริษัท หรือ เซลล์..."
                className="w-full pl-9 pr-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red placeholder-gray-300 transition-all"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">นัดหมาย</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">ชื่อบริษัท</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">สถานะล่าสุด</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {initialRecords.length > 0 ? (
                    initialRecords.map((record: any) => {
                      const primaryContact = record.company?.contacts?.[0];
                      const callbackDate = record.callbackAt ? new Date(record.callbackAt) : null;
                      const now = new Date();
                      
                      let badge = null;
                      if (callbackDate) {
                        const callbackDay = new Date(callbackDate.getFullYear(), callbackDate.getMonth(), callbackDate.getDate()).getTime();
                        const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                        
                        if (callbackDate.getTime() < now.getTime()) {
                          badge = (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100/50">
                              เกินกำหนด (Overdue)
                            </span>
                          );
                        } else if (callbackDay === todayDay) {
                          badge = (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100/50">
                              วันนี้ (Today)
                            </span>
                          );
                        } else {
                          badge = (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-100/50">
                              รอดำเนินการ (Scheduled)
                            </span>
                          );
                        }
                      }

                      return (
                        <tr key={record.id} className="group hover:bg-gray-50/60 transition-colors">
                          <td className="py-4 px-5">
                            <div className="flex flex-col">
                              <span className="text-brand-red font-black text-sm">
                                {record.callbackAt ? new Date(record.callbackAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-'}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {record.callbackAt ? new Date(record.callbackAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'} น.
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <p className="text-xs font-bold text-gray-900">{record.company?.companyName || '-'}</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                              {primaryContact ? `ผู้ติดต่อ: ${primaryContact.contactName} (${primaryContact.mobilePhone})` : 'ไม่มีข้อมูลผู้ติดต่อหลัก'}
                            </p>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex flex-col gap-1.5 items-start">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500">
                                {record.callOutcome || record.callStatus || '-'}
                              </span>
                              {badge}
                            </div>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <button 
                              onClick={() => {
                                if (primaryContact) {
                                  if (primaryContact.mobilePhone) {
                                    // 1. Open native dialer
                                    window.location.href = `tel:${primaryContact.mobilePhone}`;
                                    // 2. Redirect to log page after 1200ms
                                    setTimeout(() => {
                                      window.location.href = `/telesales/log?contactId=${primaryContact.id}&companyId=${record.companyId}&telesaleId=${record.id}&returnTo=/telesales?tab=callbacks`;
                                    }, 1200);
                                  } else {
                                    // Redirect to log page anyway (without auto-dialing)
                                    window.location.href = `/telesales/log?contactId=${primaryContact.id}&companyId=${record.companyId}&telesaleId=${record.id}&returnTo=/telesales?tab=callbacks`;
                                  }
                                } else {
                                  // Cannot log without contact. Alert and redirect to clients.
                                  alert('ไม่พบข้อมูลผู้ติดต่อหลัก กรุณาเพิ่มผู้ติดต่อในเมนูฐานข้อมูลลูกค้าก่อนทำการบันทึกการโทร');
                                  window.location.href = `/clients?page=1`;
                                }
                              }}
                              className="bg-brand-red text-white px-5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-lg shadow-red-200 hover:scale-105 transition-all"
                            >
                              CALL NOW
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-300">
                          <PhoneCall size={36} strokeWidth={1} />
                          <p className="text-xs font-bold uppercase tracking-widest">ไม่มีนัดโทรกลับ</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-black text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all active:scale-95"
                  >
                    ก่อนหน้า
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-black text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all active:scale-95"
                  >
                    ถัดไป
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-sans">
                      แสดงรายการที่ <span className="font-bold text-gray-800">{Math.min((currentPage - 1) * limit + 1, totalCount)}</span> ถึง{' '}
                      <span className="font-bold text-gray-800">{Math.min(currentPage * limit, totalCount)}</span> จากทั้งหมด{' '}
                      <span className="font-bold text-gray-800">{totalCount}</span> รายการ
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-xl gap-1.5 font-sans" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-xl px-2.5 py-2 text-gray-400 hover:bg-red-50 hover:text-brand-red disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all active:scale-95"
                      >
                        <span className="transform rotate-180 block">&#x276F;</span>
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        if (totalPages > 7 && p !== 1 && p !== totalPages && Math.abs(p - currentPage) > 1) {
                          if (p === 2 && currentPage > 3) {
                            return <span key="dots-start" className="relative inline-flex items-center px-2 text-gray-400 font-bold">...</span>;
                          }
                          if (p === totalPages - 1 && currentPage < totalPages - 2) {
                            return <span key="dots-end" className="relative inline-flex items-center px-2 text-gray-400 font-bold">...</span>;
                          }
                          return null;
                        }

                        return (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            className={`relative inline-flex items-center rounded-xl px-3.5 py-1.5 text-sm font-bold transition-all active:scale-95 ${
                              p === currentPage
                                ? 'z-10 bg-brand-red text-white shadow-md shadow-red-200'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-xl px-2.5 py-2 text-gray-400 hover:bg-red-50 hover:text-brand-red disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all active:scale-95"
                      >
                        <span>&#x276F;</span>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <TelesaleBulkUploadModal 
        isOpen={isBulkUploadOpen} 
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={() => {
          setIsBulkUploadOpen(false);
          handleTabChange('list');
        }}
      />
    </div>
  );
}
