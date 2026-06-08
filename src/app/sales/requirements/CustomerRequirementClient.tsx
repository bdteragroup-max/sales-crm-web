"use client";

import React, { useState } from 'react';
import { FileText, Plus, Search, CheckCircle2, FileSpreadsheet, ClipboardList, Printer, Edit2, Trash2, User, Phone, Send, Calculator, Clock } from 'lucide-react';
import CustomerRequirementForm from './CustomerRequirementForm';
import Link from 'next/link';
import { deleteCustomerRequirementHistory } from '@/app/actions/requirements';
import { sendRequirementForEstimation } from '@/app/actions/estimations';

interface CustomerRequirementClientProps {
  currentUser: any;
  history: any[];
}

export default function CustomerRequirementClient({ currentUser, history }: CustomerRequirementClientProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [editingData, setEditingData] = useState<any>(undefined);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSendingEstimation, setIsSendingEstimation] = useState<string | null>(null);

  const handleSendToService = async (id: string) => {
    setIsSendingEstimation(id);
    try {
      await sendRequirementForEstimation(id);
    } catch (err) {
      console.error(err);
      alert("Failed to send to service");
    } finally {
      setIsSendingEstimation(null);
    }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setEditingData(record.formData);
    setActiveTab('new');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("คุณต้องการลบข้อมูลนี้ใช่หรือไม่?")) return;
    setIsDeleting(id);
    await deleteCustomerRequirementHistory(id);
    setIsDeleting(null);
  };

  const filteredHistory = history.filter(item => {
    return (
      item.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.salesperson?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm md:overflow-hidden overflow-visible">
      {/* ── Top Header Bar ── */}
      <header className="shrink-0 md:h-20 py-4 md:py-0 border-b border-gray-100 px-6 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center shadow-lg shadow-red-200">
            <ClipboardList size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">ใบรับความต้องการลูกค้า</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer Requirement</p>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="shrink-0 flex items-center justify-between px-8 pt-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-1">
          {[
            { id: 'new' as const, label: 'สร้างใบรับความต้องการ', icon: <Plus size={14} />, action: () => setActiveTab('new') },
            { id: 'list' as const, label: `ประวัติ (${history.length})`, icon: <FileText size={14} />, action: () => setActiveTab('list') },
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
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30">
        {activeTab === 'new' ? (
          <div className="p-8">
            <CustomerRequirementForm 
              currentUser={currentUser} 
              onSuccess={() => {
                setActiveTab('list');
                setEditingId(undefined);
                setEditingData(undefined);
              }}
              editingId={editingId}
              initialData={editingData}
            />
          </div>
        ) : (
          <div className="p-8 space-y-6">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาบริษัท, ชื่อผู้ติดต่อ, พนักงานขาย..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red placeholder-gray-300 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((record: any) => {
                  const products = [];
                  if (record.formData?.["สินค้า_INVERTER"]) products.push("INVERTER");
                  if (record.formData?.["สินค้า_MOTOR"]) products.push("MOTOR");
                  if (record.formData?.["สินค้า_PUMP"]) products.push("PUMP");
                  if (record.formData?.["สินค้า_MDB"]) products.push("MDB");
                  if (record.formData?.["สินค้า_DB"]) products.push("DB");
                  if (record.formData?.["สินค้า_CONTROL"]) products.push("CONTROL");
                  if (record.formData?.["สินค้า_SOLAR_ROOF"]) products.push("SOLAR ROOF");
                  if (record.formData?.["สินค้า_SOLAR_PUMP"]) products.push("SOLAR PUMP");
                  
                  const hasElectricalPanel = ['สินค้า_INVERTER','สินค้า_MDB','สินค้า_DB','สินค้า_CONTROL'].some(key => record.formData?.[key]);
                  
                  return (
                    <div key={record.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-brand-red/30 transition-all duration-300 flex flex-col group overflow-hidden">
                      {/* Card Header */}
                      <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gradient-to-br from-gray-50/50 to-white group-hover:from-red-50/20 group-hover:to-white transition-colors">
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold text-xs shadow-sm">
                            <FileText size={12} className="text-brand-red" />
                            {record.requirementNumber || <span className="text-gray-400 italic">ไม่มีข้อมูล</span>}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">วันที่รับเอกสาร</span>
                          <span className="text-xs font-bold text-gray-900">
                            {new Date(record.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Card Body */}
                      <div className="p-5 flex-1 flex flex-col gap-4">
                        <div>
                          <h3 className="text-[15px] font-black text-gray-900 mb-2 line-clamp-1" title={record.companyName}>{record.companyName}</h3>
                          <div className="flex flex-col gap-1.5 text-[11px] text-gray-500 font-medium">
                            <span className="flex items-center gap-2"><User size={12} className="text-gray-400"/> {record.contactName || '—'}</span>
                            <span className="flex items-center gap-2"><Phone size={12} className="text-gray-400"/> {record.formData?.["เบอร์โทร"] || '—'}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                          <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            <div className="w-5 h-5 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-[9px] shadow-sm">
                              {record.salesperson?.charAt(0) || '-'}
                            </div>
                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wide">{record.salesperson}</span>
                          </div>
                          <div className="flex flex-wrap justify-end gap-1 max-w-[50%]">
                            {products.length > 0 ? products.slice(0,2).map(p => (
                              <span key={p} className="px-2 py-1 bg-brand-red/5 border border-brand-red/10 text-brand-red text-[9px] font-black rounded-md">{p}</span>
                            )) : <span className="text-gray-300 text-[10px]">—</span>}
                            {products.length > 2 && (
                              <span className="px-1.5 py-1 bg-gray-100 border border-gray-200 text-gray-500 text-[9px] font-black rounded-md">+{products.length - 2}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Card Actions */}
                      <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center gap-2 justify-between">
                        <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(record); }}
                            className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <div className="w-px h-4 bg-gray-200 self-center"></div>
                          <Link
                            href={`/sales/requirements/print/${record.id}`}
                            target="_blank"
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Print"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Printer size={14} />
                          </Link>
                          <div className="w-px h-4 bg-gray-200 self-center"></div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                            disabled={isDeleting === record.id}
                            className={`p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${isDeleting === record.id ? 'opacity-50' : ''}`}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        
                        <div className="flex flex-wrap justify-end items-center gap-2 mt-2 sm:mt-0">
                          {record.hasQuotation ? (
                            <div 
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-default"
                              onClick={(e) => e.stopPropagation()}
                              title="มีการเปิดใบเสนอราคาจากใบรับความต้องการนี้แล้ว"
                            >
                              <CheckCircle2 size={14} /> เปิดใบเสนอราคาแล้ว
                            </div>
                          ) : (
                            <Link 
                              href={`/sales?reqId=${record.id}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-red text-white text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-red-600 hover:shadow-lg hover:shadow-red-200 transition-all transform hover:-translate-y-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Plus size={14} /> สร้างใบเสนอราคา
                            </Link>
                          )}

                          {hasElectricalPanel && !record.isSentToService && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSendToService(record.id); }}
                              disabled={isSendingEstimation === record.id}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-100 transition-colors"
                            >
                              {isSendingEstimation === record.id ? 'กำลังส่ง...' : <><Send size={14} /> ส่งให้ช่างประเมินราคา</>}
                            </button>
                          )}

                          {record.isSentToService && record.estimationStatus === 'PENDING' && (
                            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-50 text-yellow-600 border border-yellow-200 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-default">
                              <Clock size={14} /> รอช่างประเมินราคา
                            </div>
                          )}

                          {record.estimationStatus === 'ESTIMATED' && (
                            <div className="inline-flex flex-col items-end gap-1 px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl cursor-default text-right mr-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                                <Calculator size={10} /> ราคาประเมิน: ฿{record.estimatedPrice?.toLocaleString()}
                              </span>
                              {record.estimationNote && (
                                <span className="text-[9px] text-emerald-500 max-w-[150px] truncate" title={record.estimationNote}>
                                  หมายเหตุ: {record.estimationNote}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-gray-100 border-dashed">
                  <div className="flex flex-col items-center gap-4 text-gray-300">
                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                      <ClipboardList size={32} strokeWidth={1.5} />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                      {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีประวัติใบรับความต้องการ'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {filteredHistory.length > 0 && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                แสดง {filteredHistory.length} รายการ จาก {history.length} รายการทั้งหมด
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
