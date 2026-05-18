"use client";

import React, { useState } from 'react';
import { FileText, Plus, Search, Edit2, FileSpreadsheet, PhoneCall, CheckCircle2, Clock } from 'lucide-react';
import NewTelesaleForm from './components/NewTelesaleForm';
import TelesaleBulkUploadModal from './components/TelesaleBulkUploadModal';

interface TelesalesClientPageProps {
  userFullName?: string;
  initialRecords?: any[];
}

export default function TelesalesClientPage({ userFullName, initialRecords = [] }: TelesalesClientPageProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'list' | 'callbacks'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Stats
  const today = new Date().toLocaleDateString('th-TH');
  const todayRecords = initialRecords.filter(r => new Date(r.createdAt).toLocaleDateString('th-TH') === today);
  const totalCalls = todayRecords.length;
  const interestedCount = todayRecords.filter(r => r.callOutcome === 'สนใจ' || r.callOutcome === 'นัดหมายสำเร็จ').length;
  const callbacksToday = initialRecords.filter(r => r.callbackAt && new Date(r.callbackAt).toLocaleDateString('th-TH') === today).length;

  const filteredRecords = initialRecords.filter(record => 
    record.company?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const callbackRecords = initialRecords
    .filter(record => record.callbackAt)
    .sort((a, b) => new Date(a.callbackAt).getTime() - new Date(b.callbackAt).getTime());

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setActiveTab('new');
  };

  const handleCreateNew = () => {
    setEditingRecord(null);
    setActiveTab('new');
  };

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
            { label: 'โทรวันนี้',        value: totalCalls,                  icon: <PhoneCall size={14} />, color: 'text-gray-400', bg: 'bg-gray-50' },
            { label: 'นัดหมายสำเร็จ',    value: interestedCount,             icon: <CheckCircle2 size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'นัดโทรกลับวันนี้', value: callbacksToday,              icon: <Clock size={14} />, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'รายการทั้งหมด',    value: initialRecords.length,        icon: <FileText size={14} />, color: 'text-brand-red', bg: 'bg-red-50' },
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
          { id: 'list' as const, label: `รายการบันทึก (${initialRecords.length})`, icon: <FileText size={14} />, action: () => setActiveTab('list') },
          { id: 'callbacks' as const, label: `นัดโทรกลับ (${callbackRecords.length})`, icon: <PhoneCall size={14} />, action: () => setActiveTab('callbacks') },
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
                  setActiveTab('list');
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record: any) => (
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
          </div>
        )}

        {activeTab === 'callbacks' && (
          <div className="p-8 space-y-6">
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
                  {callbackRecords.length > 0 ? (
                    callbackRecords.map((record: any) => (
                      <tr key={record.id} className="group hover:bg-gray-50/60 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex flex-col">
                            <span className="text-brand-red font-black text-sm">
                              {new Date(record.callbackAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {new Date(record.callbackAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <p className="text-xs font-bold text-gray-900">{record.company?.companyName || '-'}</p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">{record.user?.fullName || '-'}</p>
                        </td>
                        <td className="py-4 px-5">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-400">
                            {record.callOutcome || record.callStatus || '-'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <button 
                            onClick={() => handleEdit(record)}
                            className="bg-brand-red text-white px-5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-lg shadow-red-200 hover:scale-105 transition-all"
                          >
                            CALL NOW
                          </button>
                        </td>
                      </tr>
                    ))
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
          </div>
        )}
      </div>

      <TelesaleBulkUploadModal 
        isOpen={isBulkUploadOpen} 
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={() => {
          setIsBulkUploadOpen(false);
          setActiveTab('list');
        }}
      />
    </div>
  );
}
