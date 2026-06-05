"use client";

import React, { useState } from 'react';
import { FileText, FileSpreadsheet, Plus, Search, Edit2, Trash2, TrendingUp, CheckCircle2, Clock, XCircle } from 'lucide-react';
import NewQuotationForm from './components/NewQuotationForm';
import BulkUploadModal from './components/BulkUploadModal';
import { deleteQuotation } from '@/app/actions/sales';

interface SalesClientPageProps {
  initialQuotations?: any[];
  businessTypes?: string[];
  currentUserSale?: any;
  prefillData?: {
    company: any;
    contact: any;
  } | null;
  editingQuotation?: any | null; // Full quotation from DB when coming from /pipeline?editId=xxx
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  'เปิดบิลแล้ว':         { label: 'เปิดบิลแล้ว',         cls: 'bg-emerald-500 text-white' },
  'รอจัดทำ PO':          { label: 'รอจัดทำ PO',           cls: 'bg-amber-400 text-white' },
  'PO แล้วรอสินค้า':     { label: 'PO รอสินค้า',          cls: 'bg-amber-400 text-white' },
  'PO แล้วรอมัดจำ':      { label: 'PO รอมัดจำ',           cls: 'bg-amber-400 text-white' },
  'PO แล้วรอเงินโอน':    { label: 'PO รอเงินโอน',         cls: 'bg-amber-400 text-white' },
  'เสนอราคา':            { label: 'เสนอราคา',             cls: 'bg-brand-red text-white' },
  'รอใบประเมินราคา':     { label: 'รอประเมิน',            cls: 'bg-sky-500 text-white' },
  'ยกเลิก-Revise':       { label: 'Revise',               cls: 'bg-gray-200 text-gray-500' },
};

function statusBadge(status: string) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>;
  const isReject = status.startsWith('ปฏิเสธ');
  if (isReject) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-400">
      <XCircle size={10} /> ปฏิเสธ
    </span>
  );
  const cfg = STATUS_MAP[status];
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${cfg?.cls ?? 'bg-gray-100 text-gray-500'}`}>
      {cfg?.label ?? status}
    </span>
  );
}

export default function SalesClientPage({ initialQuotations = [], businessTypes = [], currentUserSale, prefillData, editingQuotation }: SalesClientPageProps) {
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // If a full quotation was passed in for editing (from pipeline), open on the edit form immediately
  const [activeTab, setActiveTab] = useState<'new' | 'list'>(editingQuotation ? 'new' : 'new');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingData, setEditingData] = useState<any>(() => {
    // Priority 1: a specific quotation to edit (from pipeline ?editId=)
    if (editingQuotation) return editingQuotation;
    // Priority 2: prefill for a brand-new quotation
    if (prefillData) {
      return {
        company: prefillData.company,
        contact: prefillData.contact,
        companyId: prefillData.company?.id || null,
        isPrefilled: true
      };
    }
    return null;
  });
  const [statusFilter, setStatusFilter] = useState('');


  const filteredQuotations = initialQuotations.filter(q => {
    const matchSearch =
      (q.company?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.quotationNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.contact?.contactName?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const wonCount   = initialQuotations.filter(q => q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')).length;
  const openCount  = initialQuotations.filter(q => q.status === 'เสนอราคา').length;
  const lostCount  = initialQuotations.filter(q => q.status?.startsWith('ปฏิเสธ')).length;
  const wonValue   = initialQuotations
    .filter(q => q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO'))
    .reduce((s, q) => s + (Number(q.actualClosingAmount) || Number(q.totalAmountBeforeVat) || 0), 0);

  const handleEdit = (q: any) => { setEditingData(q); setActiveTab('new'); };
  const handleCreateNew = () => { setEditingData(null); setActiveTab('new'); };

  const handleDelete = async (q: any) => {
    if (window.confirm(`คุณต้องการลบข้อมูล ${q.quotationNumber || q.company?.companyName || 'นี้'} ใช่หรือไม่?`)) {
      const res = await deleteQuotation(q.id);
      if (!res.success) {
        alert(res.error || 'ลบข้อมูลไม่สำเร็จ');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm md:overflow-hidden overflow-visible">

      {/* ── Top Header Bar ── */}
      <header className="shrink-0 md:h-20 py-4 md:py-0 border-b border-gray-100 px-6 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center shadow-lg shadow-red-200">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">ใบเสนอราคา</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quotation Management</p>
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
        <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 border-b border-gray-100 divide-x divide-y md:divide-y-0 divide-gray-100">
          {[
            { label: 'ทั้งหมด',        value: initialQuotations.length, icon: <FileText size={14} />, color: 'text-gray-400', bg: 'bg-gray-50' },
            { label: 'ปิดได้ (Won)',    value: wonCount,                  icon: <CheckCircle2 size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'รออยู่ระหว่างดำเนินการ', value: openCount,          icon: <Clock size={14} />, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'ยอด Won รวม',     value: `฿${(wonValue/1000000).toFixed(2)}M`, icon: <TrendingUp size={14} />, color: 'text-brand-red', bg: 'bg-red-50' },
          ].map(k => (
            <div key={k.label} className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 ${k.bg}`}>
              <span className={k.color}>{k.icon}</span>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{k.label}</p>
                <p className={`text-sm md:text-lg font-black ${k.color}`}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="shrink-0 flex items-center justify-between px-8 pt-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-1">
          {[
            { id: 'new' as const, label: editingData ? 'แก้ไขใบเสนอราคา' : 'บันทึกใหม่', icon: <Plus size={14} />, action: handleCreateNew },
            { id: 'list' as const, label: `รายการทั้งหมด (${initialQuotations.length})`, icon: <FileText size={14} />, action: () => setActiveTab('list') },
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

        {/* Back-to-pipeline button — only shown when arriving from /pipeline?editId= */}
        {editingQuotation && (
          <a
            href="/pipeline"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-brand-red hover:bg-red-50 border border-gray-200 rounded-xl transition-all mb-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            กลับ Pipeline
          </a>
        )}
      </div>


      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'new' ? (
          <div className="p-8">
            <NewQuotationForm
              businessTypes={businessTypes}
              initialData={editingData}
              currentUserSale={currentUserSale}
              onSuccess={() => { setEditingData(null); setActiveTab('list'); }}
            />
          </div>
        ) : (
          <div className="p-8 space-y-6">

            {/* Search + Filter row */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาบริษัท, เลขที่ใบเสนอราคา..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red placeholder-gray-300 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-[11px] font-black uppercase tracking-widest border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              >
                <option value="">สถานะทั้งหมด</option>
                <option>เปิดบิลแล้ว</option>
                <option>รอจัดทำ PO</option>
                <option>PO แล้วรอสินค้า</option>
                <option>PO แล้วรอมัดจำ</option>
                <option>PO แล้วรอเงินโอน</option>
                <option>เสนอราคา</option>
                <option>ปฏิเสธ-ได้ที่อื่นแล้ว</option>
                <option>ปฏิเสธ-ยกเลิกสินค้า</option>
                <option>ปฏิเสธ-อื่นๆ</option>
                <option>รอใบประเมินราคา</option>
                <option>ยกเลิก-Revise</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">วันที่</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">เลขที่ใบเสนอราคา</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">บริษัท</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">ยอดเสนอราคา</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">ยอดปิดจริง</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">สถานะ</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">ผู้ติดต่อ</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredQuotations.length > 0 ? (
                    filteredQuotations.map((record: any) => (
                      <tr key={record.id} className="group hover:bg-gray-50/60 transition-colors">
                        <td className="py-4 px-5 text-[11px] font-bold text-gray-400 whitespace-nowrap">
                          {(() => {
                            const d = record.billingDate || record.poDate || record.quotationDate || record.updatedAt || record.createdAt;
                            return d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
                          })()}
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-xs font-black text-gray-800 font-mono">{record.quotationNumber || '—'}</span>
                        </td>
                        <td className="py-4 px-5 max-w-[200px]">
                          <p className="text-xs font-bold text-gray-900 truncate">{record.company?.companyName || '—'}</p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">{record.company?.businessType || ''}</p>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <span className="text-xs font-bold text-gray-500 font-mono">
                            {record.totalAmountBeforeVat ? `฿${Number(record.totalAmountBeforeVat).toLocaleString('th-TH', { maximumFractionDigits: 0 })}` : '—'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <span className={`text-xs font-black font-mono ${record.actualClosingAmount ? 'text-emerald-600' : 'text-gray-300'}`}>
                            {record.actualClosingAmount ? `฿${Number(record.actualClosingAmount).toLocaleString('th-TH', { maximumFractionDigits: 0 })}` : '—'}
                          </span>
                        </td>
                        <td className="py-4 px-5">{statusBadge(record.status)}</td>
                        <td className="py-4 px-5">
                          <p className="text-[11px] font-bold text-gray-600">{record.contact?.contactName || '—'}</p>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(record)}
                              className="p-2 text-gray-300 hover:text-brand-red hover:bg-red-50 rounded-xl transition-all group-hover:text-gray-500"
                              title="แก้ไข"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(record)}
                              className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group-hover:text-gray-500"
                              title="ลบ"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-300">
                          <FileText size={36} strokeWidth={1} />
                          <p className="text-xs font-bold uppercase tracking-widest">
                            {searchTerm || statusFilter ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีใบเสนอราคา'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredQuotations.length > 0 && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                แสดง {filteredQuotations.length} รายการ จาก {initialQuotations.length} รายการทั้งหมด
              </p>
            )}
          </div>
        )}
      </div>

      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
