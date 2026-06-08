"use client";

import React, { useState } from 'react';
import { Calculator, CheckCircle2, Clock, FileText, Search, User, X, Printer } from 'lucide-react';
import Link from 'next/link';
import { submitEstimation } from '@/app/actions/estimations';

interface EstimationsClientPageProps {
  currentUser: any;
  initialRecords: any[];
}

export default function EstimationsClientPage({ currentUser, initialRecords }: EstimationsClientPageProps) {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ESTIMATED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | ''>('');
  const [estimationNote, setEstimationNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredRecords = initialRecords.filter(item => {
    const statusMatch = activeTab === 'PENDING' 
      ? item.estimationStatus === 'PENDING' 
      : item.estimationStatus === 'ESTIMATED';
      
    const searchMatch = 
      item.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.salesperson?.toLowerCase().includes(searchTerm.toLowerCase());
      
    return statusMatch && searchMatch;
  });

  const handleOpenModal = (req: any) => {
    setSelectedReq(req);
    setEstimatedPrice('');
    setEstimationNote('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || estimatedPrice === '') return;
    
    setIsSubmitting(true);
    try {
      await submitEstimation(
        selectedReq.id,
        {
          estimatedPrice: Number(estimatedPrice),
          estimationNote: estimationNote
        },
        currentUser.fullName
      );
      setIsModalOpen(false);
      // Wait for revalidation
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error(err);
      alert("Failed to submit estimation");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm md:overflow-hidden overflow-visible">
      {/* ── Top Header Bar ── */}
      <header className="shrink-0 md:h-20 py-4 md:py-0 border-b border-gray-100 px-6 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#ff2301] flex items-center justify-center shadow-lg shadow-red-200">
            <Calculator size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">ประเมินราคางานซ่อม/ประกอบ</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price Estimations</p>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="shrink-0 flex items-center justify-between px-8 pt-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-1">
          {[
            { id: 'PENDING' as const, label: 'รอประเมิน', icon: <Clock size={14} /> },
            { id: 'ESTIMATED' as const, label: 'ประเมินแล้ว', icon: <CheckCircle2 size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'text-[#ff2301] border-[#ff2301] bg-red-50/50'
                  : 'text-gray-400 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30 p-8 space-y-6">
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาบริษัท, พนักงานขาย..."
              className="w-full pl-9 pr-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] placeholder-gray-300 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record: any) => {
              const products = [];
              if (record.formData?.["สินค้า_INVERTER"]) products.push("INVERTER");
              if (record.formData?.["สินค้า_MDB"]) products.push("MDB");
              if (record.formData?.["สินค้า_DB"]) products.push("DB");
              if (record.formData?.["สินค้า_CONTROL"]) products.push("CONTROL");
              
              return (
                <div key={record.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group overflow-hidden">
                  {/* Card Header */}
                  <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gradient-to-br from-gray-50/50 to-white">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold text-xs shadow-sm">
                        <FileText size={12} className="text-[#ff2301]" />
                        {record.requirementNumber || <span className="text-gray-400 italic">ไม่มีข้อมูล</span>}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">วันที่รับเรื่อง</span>
                      <span className="text-xs font-bold text-gray-900">
                        {new Date(record.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <div>
                      <h3 className="text-[15px] font-black text-gray-900 mb-2 line-clamp-1">{record.companyName}</h3>
                      <div className="flex flex-col gap-1.5 text-[11px] text-gray-500 font-medium">
                        <span className="flex items-center gap-2"><User size={12} className="text-gray-400"/> ผู้ติดต่อ: {record.contactName || '—'}</span>
                        <span className="flex items-center gap-2"><User size={12} className="text-gray-400"/> เซลล์: {record.salesperson}</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">สิ่งที่ต้องการประเมิน</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {products.length > 0 ? products.map(p => (
                          <span key={p} className="px-2 py-1 bg-red-50 border border-red-100 text-[#ff2301] text-[10px] font-black rounded-md">{p}</span>
                        )) : <span className="text-gray-300 text-[10px]">—</span>}
                      </div>

                      {/* Detailed specifications */}
                      {record.formData && (
                        <div className="space-y-1.5 mt-2">
                          {record.formData["สินค้า_INVERTER"] && (
                            <div className="text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-600">
                              <strong className="text-gray-800">INVERTER:</strong> 
                              {record.formData["INVERTER_ยี่ห้อ"] ? ` ยี่ห้อ ${record.formData["INVERTER_ยี่ห้อ"]}` : ''}
                              {record.formData["INVERTER_ขนาดเครื่อง_kW"] ? ` ขนาด ${record.formData["INVERTER_ขนาดเครื่อง_kW"]}kW` : ''}
                              {record.formData["INVERTER_ขนาดเครื่อง_HP"] ? ` ${record.formData["INVERTER_ขนาดเครื่อง_HP"]}HP` : ''}
                              {record.formData["INVERTER_Input_220V_1P"] ? ` (Input 220V 1P)` : ''}
                              {record.formData["INVERTER_Input_220V_3P"] ? ` (Input 220V 3P)` : ''}
                              {record.formData["INVERTER_Input_380V_3P"] ? ` (Input 380V 3P)` : ''}
                              {record.formData["INVERTER_Input_อื่นๆ"] ? ` (${record.formData["INVERTER_Input_อื่นๆ_ระบุ"]})` : ''}
                            </div>
                          )}
                          {record.formData["สินค้า_MDB"] && (
                            <div className="text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-600">
                              <strong className="text-gray-800">MDB:</strong> {record.formData["MDB_รายละเอียด"] || 'ไม่ระบุรายละเอียด'}
                            </div>
                          )}
                          {record.formData["สินค้า_DB"] && (
                            <div className="text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-600">
                              <strong className="text-gray-800">DB:</strong> {record.formData["DB_รายละเอียด"] || 'ไม่ระบุรายละเอียด'}
                            </div>
                          )}
                          {record.formData["สินค้า_CONTROL"] && (
                            <div className="text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-600">
                              <strong className="text-gray-800">CONTROL:</strong> {record.formData["CONTROL_รายละเอียด_อุปกรณ์"] || 'ไม่ระบุรายละเอียด'}
                            </div>
                          )}
                          {record.note && (
                            <div className="text-[11px] bg-yellow-50/50 p-2 rounded-lg border border-yellow-100/50 text-gray-700 mt-2">
                              <strong className="text-gray-800">Note จากเซลล์:</strong> {record.note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Show Result if Estimated */}
                    {activeTab === 'ESTIMATED' && (
                      <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ราคาประเมิน</span>
                          <span className="text-sm font-black text-gray-900">฿{record.estimatedPrice?.toLocaleString()}</span>
                        </div>
                        {record.estimationNote && (
                          <p className="text-[11px] text-gray-600 mt-2"><strong>หมายเหตุ:</strong> {record.estimationNote}</p>
                        )}
                        <p className="text-[9px] text-gray-400 mt-2 text-right">ประเมินโดย {record.estimatedBy}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Card Actions */}
                  <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      href={`/sales/requirements/print/${record.id}`}
                      target="_blank"
                      className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 shadow-sm transition-all flex items-center gap-2"
                      title="Print PDF"
                    >
                      <Printer size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">PDF</span>
                    </Link>
                    
                    {activeTab === 'PENDING' && (
                      <button 
                        onClick={() => handleOpenModal(record)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-[#ff2301] hover:shadow-lg hover:shadow-red-200 transition-all transform hover:-translate-y-0.5"
                      >
                        <Calculator size={14} /> ประเมินราคา
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-gray-100 border-dashed">
              <div className="flex flex-col items-center gap-4 text-gray-300">
                <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                  <Calculator size={32} strokeWidth={1.5} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                  {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : `ไม่มีข้อมูล${activeTab === 'PENDING' ? 'ที่รอประเมิน' : 'ที่ประเมินแล้ว'}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estimation Modal */}
      {isModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <Calculator size={16} className="text-[#ff2301]" />
                </div>
                <h2 className="text-lg font-black text-gray-900">ประเมินราคา</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <p className="text-sm font-bold text-gray-800 mb-1">{selectedReq.companyName}</p>
                <p className="text-xs text-gray-500">เซลล์: {selectedReq.salesperson}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">ราคาประเมิน (บาท) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min="0"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] bg-gray-50/50"
                  placeholder="เช่น 15000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">รายละเอียดเพิ่มเติม (ถ้ามี)</label>
                <textarea
                  rows={3}
                  value={estimationNote}
                  onChange={(e) => setEstimationNote(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] bg-gray-50/50 resize-none"
                  placeholder="รายละเอียดอุปกรณ์ที่ต้องใช้หรือข้อจำกัด..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || estimatedPrice === ''}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-[#ff2301] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg hover:shadow-red-200 transition-all"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกราคา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
