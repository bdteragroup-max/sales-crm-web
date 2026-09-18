"use client";

import React, { useState } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowUpDown, 
  Filter,
  Building2,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import NewQuotationForm from './components/NewQuotationForm';
import BulkUploadModal from './components/BulkUploadModal';

import { deleteQuotation } from '@/app/actions/sales';
import { updateQuotationStatus } from '@/app/actions/pipeline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { POTransitionModal, QuotationTransitionModal, AppointmentTransitionModal } from '@/app/pipeline/components/PipelineModals';
import { calculateQuotationExpiration } from '@/utils/quotation-expiration';

const ALL_STATUSES = [
  'ความสนใจ',
  'นัดหมาย',
  'เสนอราคา',
  'รอจัดทำ PO',
  'PO แล้วรอสินค้า',
  'PO แล้วรอมัดจำ',
  'PO แล้วรอเงินโอน',
  'เปิดบิลแล้ว',
  'ปฏิเสธ-ได้ที่อื่นแล้ว',
  'ปฏิเสธ-ยกเลิกสินค้า',
  'ปฏิเสธ-อื่นๆ',
  'รอใบประเมินราคา',
  'ยกเลิก-Revise'
];

interface SalesClientPageProps {
  initialQuotations?: any[];
  businessTypes?: string[];
  currentUserSale?: any;
  prefillData?: {
    company: any;
    contact: any;
    requirementNumber?: string;
    requirementDate?: any;
    productType?: string;
    productInterest?: string;
  } | null;
  editingQuotation?: any | null;
}

const STATUS_MAP: Record<string, { label: string; badgeCls: string; dotCls: string }> = {
  'เปิดบิลแล้ว': { label: 'เปิดบิลแล้ว', badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotCls: 'bg-emerald-500' },
  'รอจัดทำ PO': { label: 'รอจัดทำ PO', badgeCls: 'bg-amber-50 text-amber-700 border-amber-200', dotCls: 'bg-amber-500' },
  'PO แล้วรอสินค้า': { label: 'PO รอสินค้า', badgeCls: 'bg-amber-50 text-amber-700 border-amber-200', dotCls: 'bg-amber-500' },
  'PO แล้วรอมัดจำ': { label: 'PO รอมัดจำ', badgeCls: 'bg-amber-50 text-amber-700 border-amber-200', dotCls: 'bg-amber-500' },
  'PO แล้วรอเงินโอน': { label: 'PO รอเงินโอน', badgeCls: 'bg-amber-50 text-amber-700 border-amber-200', dotCls: 'bg-amber-500' },
  'เสนอราคา': { label: 'เสนอราคา', badgeCls: 'bg-red-50 text-red-700 border-red-200', dotCls: 'bg-red-600' },
  'หมดอายุ': { label: 'หมดอายุ', badgeCls: 'bg-stone-100 text-stone-700 border-stone-300', dotCls: 'bg-stone-500' },
  'รอใบประเมินราคา': { label: 'รอประเมิน', badgeCls: 'bg-slate-100 text-slate-700 border-slate-300', dotCls: 'bg-slate-500' },
  'ยกเลิก-Revise': { label: 'Revise', badgeCls: 'bg-slate-100 text-slate-500 border-slate-200', dotCls: 'bg-slate-400' },
};

function statusBadge(status: string) {
  if (!status) return <span className="text-slate-300 text-xs">—</span>;
  const isReject = status.startsWith('ปฏิเสธ');
  if (isReject) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <XCircle size={12} className="text-slate-400" />
        <span>{status}</span>
      </span>
    );
  }
  const cfg = STATUS_MAP[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg?.badgeCls ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dotCls ?? 'bg-slate-400'}`}></span>
      <span>{cfg?.label ?? status}</span>
    </span>
  );
}

export default function SalesClientPage({ 
  initialQuotations = [], 
  businessTypes = [], 
  currentUserSale, 
  prefillData, 
  editingQuotation 
}: SalesClientPageProps) {
  const router = useRouter();
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // If coming from pipeline edit, default to edit tab
  const [activeTab, setActiveTab] = useState<'new' | 'list' | 'expired'>(editingQuotation ? 'new' : 'new');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingData, setEditingData] = useState<any>(() => {
    if (editingQuotation) {
      return {
        ...editingQuotation,
        companyId: editingQuotation.company?.id || '',
        contactId: editingQuotation.contact?.id || '',
      };
    }
    return prefillData || null;
  });

  const [pendingTransition, setPendingTransition] = useState<{
    id: string;
    quotation: any;
    nextDbStatus: string;
    type: 'po' | 'closed' | 'quotation' | 'appointment';
  } | null>(null);

  const [showCoinModal, setShowCoinModal] = useState(false);
  const [coinModalData, setCoinModalData] = useState({ gold: 0, message: '' });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const executeMove = async (id: string, status: string, extraData?: any) => {
    try {
      const response = await updateQuotationStatus(id, status, extraData);
      if (response && response.success && 'awardedGold' in response && response.awardedGold && response.awardedGold > 0) {
        setCoinModalData({ gold: response.awardedGold, message: response.awardMessage || '' });
        setShowCoinModal(true);
      }
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    }
  };

  const handleStatusChange = (record: any, newStatus: string) => {
    if (newStatus === record.status) return;
    if (newStatus === 'หมดอายุ') return; // System-controlled status only

    if (newStatus === 'รอจัดทำ PO' || newStatus === 'PO แล้วรอสินค้า' || newStatus === 'PO แล้วรอมัดจำ' || newStatus === 'PO แล้วรอเงินโอน') {
      setPendingTransition({ id: record.id, quotation: record, nextDbStatus: newStatus, type: 'po' });
      return;
    }

    if (newStatus === 'เปิดบิลแล้ว') {
      setPendingTransition({ id: record.id, quotation: record, nextDbStatus: newStatus, type: 'closed' });
      return;
    }

    if (newStatus === 'เสนอราคา' && !record.quotationNumber) {
      setPendingTransition({ id: record.id, quotation: record, nextDbStatus: newStatus, type: 'quotation' });
      return;
    }

    if (newStatus === 'นัดหมาย') {
      setPendingTransition({ id: record.id, quotation: record, nextDbStatus: newStatus, type: 'appointment' });
      return;
    }

    executeMove(record.id, newStatus);
  };

  const [statusFilter, setStatusFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const nonExpiredQuotations = initialQuotations.filter(q => q.status !== 'หมดอายุ');
  const expiredQuotations = initialQuotations.filter(q => q.status === 'หมดอายุ');
  const expiredCount = expiredQuotations.length;

  const currentTabQuotations = activeTab === 'expired' ? expiredQuotations : nonExpiredQuotations;

  const filteredQuotations = currentTabQuotations.filter(q => {
    const matchSearch =
      (q.company?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.quotationNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.contact?.contactName?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = activeTab === 'expired' ? true : (!statusFilter || q.status === statusFilter);
    return matchSearch && matchStatus;
  });

  const sortedQuotations = [...filteredQuotations].sort((a, b) => {
    if (!sortConfig) return 0;

    let aValue: any;
    let bValue: any;

    if (sortConfig.key === 'date') {
      aValue = a.billingDate || a.poDate || a.quotationDate || a.updatedAt || a.createdAt;
      bValue = b.billingDate || b.poDate || b.quotationDate || b.updatedAt || b.createdAt;
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    } else if (sortConfig.key === 'quotationNumber') {
      aValue = a.quotationNumber || '';
      bValue = b.quotationNumber || '';
    } else if (sortConfig.key === 'company') {
      aValue = a.company?.companyName || '';
      bValue = b.company?.companyName || '';
    } else if (sortConfig.key === 'totalAmount') {
      aValue = Number(a.totalAmountBeforeVat) || 0;
      bValue = Number(b.totalAmountBeforeVat) || 0;
    } else if (sortConfig.key === 'closingAmount') {
      aValue = Number(a.actualClosingAmount) || 0;
      bValue = Number(b.actualClosingAmount) || 0;
    } else if (sortConfig.key === 'expirationDate') {
      const expA = calculateQuotationExpiration(a);
      const expB = calculateQuotationExpiration(b);
      aValue = expA.effectiveExpiryDate ? new Date(expA.effectiveExpiryDate).getTime() : 0;
      bValue = expB.effectiveExpiryDate ? new Date(expB.effectiveExpiryDate).getTime() : 0;
    } else if (sortConfig.key === 'status') {
      aValue = a.status || '';
      bValue = b.status || '';
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const wonCount = initialQuotations.filter(q => q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')).length;
  const openCount = initialQuotations.filter(q => q.status === 'เสนอราคา').length;
  const lostCount = initialQuotations.filter(q => q.status?.startsWith('ปฏิเสธ')).length;
  const wonValue = initialQuotations
    .filter(q => q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO'))
    .reduce((s, q) => s + (Number(q.actualClosingAmount) || Number(q.totalAmountBeforeVat) || 0), 0);

  const handleEdit = (q: any) => { setEditingData(q); setActiveTab('new'); };
  const handleCreateNew = () => { setEditingData(null); setActiveTab('new'); };

  const handleDelete = (q: any) => {
    setQuotationToDelete(q);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!quotationToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteQuotation(quotationToDelete.id);
      if (!res.success) {
        alert(res.error || 'ลบข้อมูลไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setQuotationToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm md:overflow-hidden overflow-visible">

      {/* ── Top Command Bar ── */}
      <header className="shrink-0 border-b border-slate-200/80 px-6 md:px-8 py-4 md:py-5 bg-white flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-md shadow-red-600/20 text-white shrink-0">
            <FileText size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">ระบบใบเสนอราคา</h1>
              <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200/80">
                Sales & Quotes
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">บริหารจัดการข้อเสนอราคา ติดตามสถานะ และข้อมูลการขายอย่างแม่นยำ</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {activeTab !== 'new' && (
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm shadow-red-600/20 active:scale-95"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>สร้างใบเสนอราคาใหม่</span>
            </button>
          )}

          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            <span>นำเข้า Excel</span>
          </button>
        </div>
      </header>

      {/* ── Symmetrical 4-Card KPI Strip (Visible in List & Expired Views) ── */}
      {activeTab !== 'new' && (
        <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 p-4 md:px-8 md:py-5 bg-slate-50/70 border-b border-slate-200/80">
          {[
            { 
              label: 'ใบเสนอราคาทั้งหมด', 
              subLabel: 'Total Quotations', 
              value: initialQuotations.length.toLocaleString(), 
              icon: <FileText size={18} />, 
              iconBg: 'bg-slate-100 text-slate-700',
              borderAccent: 'border-slate-200' 
            },
            { 
              label: 'ปิดการขายได้ (Won)', 
              subLabel: 'Closed & Confirmed', 
              value: wonCount.toLocaleString(), 
              icon: <CheckCircle2 size={18} />, 
              iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
              borderAccent: 'border-slate-200' 
            },
            { 
              label: 'กำลังดำเนินการ (Open)', 
              subLabel: 'In Progress / Pipeline', 
              value: openCount.toLocaleString(), 
              icon: <Clock size={18} />, 
              iconBg: 'bg-amber-50 text-amber-600 border border-amber-200/60',
              borderAccent: 'border-slate-200' 
            },
            { 
              label: 'ยอด Won สะสม', 
              subLabel: 'Total Won Value', 
              value: `฿${(wonValue / 1000000).toFixed(2)}M`, 
              icon: <TrendingUp size={18} />, 
              iconBg: 'bg-red-50 text-red-600 border border-red-200/60',
              borderAccent: 'border-red-200' 
            },
          ].map((k, idx) => (
            <div 
              key={idx} 
              className={`bg-white rounded-2xl border ${k.borderAccent} p-4 md:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-sm hover:border-slate-300`}
            >
              <div className="space-y-1">
                <p className="text-[11px] font-black text-slate-500 tracking-tight">{k.label}</p>
                <p className="text-xl md:text-2xl font-black text-slate-900 tracking-tight font-mono">{k.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k.subLabel}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${k.iconBg}`}>
                {k.icon}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Symmetrical Tab Switcher ── */}
      <div className="shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-slate-200/80 bg-white">
        <div className="flex items-center gap-2 py-2.5">
          <button
            onClick={handleCreateNew}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all ${
              activeTab === 'new'
                ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{editingData ? 'แก้ไขใบเสนอราคา' : 'สร้างใบเสนอราคาใหม่'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('list');
              setStatusFilter('');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all ${
              activeTab === 'list'
                ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText size={15} strokeWidth={2.5} />
            <span>ประวัติใบเสนอราคา</span>
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'list' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {nonExpiredQuotations.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('expired');
              setStatusFilter('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl transition-all ${
              activeTab === 'expired'
                ? 'bg-stone-800 text-white shadow-sm shadow-stone-800/20'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
            title="ดูใบเสนอราคาที่หมดอายุแล้ว"
          >
            <Clock size={15} strokeWidth={2.5} />
            <span>หมดอายุ (Expired)</span>
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'expired' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
            }`}>
              {expiredCount}
            </span>
          </button>
        </div>

        {/* Back-to-pipeline button if editing */}
        {editingQuotation && (
          <Link
            href="/pipeline"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition-all"
          >
            <span>กลับ Pipeline</span>
            <ChevronRight size={14} />
          </Link>
        )}
      </div>

      {/* ── Status Transition Modals ── */}
      {pendingTransition?.type === 'quotation' && (
        <QuotationTransitionModal
          quotation={pendingTransition.quotation}
          onConfirm={(qtNumber) => {
            executeMove(pendingTransition.id, pendingTransition.nextDbStatus, { quotationNumber: qtNumber });
            setPendingTransition(null);
          }}
          onCancel={() => setPendingTransition(null)}
        />
      )}
      {pendingTransition?.type === 'po' && (
        <POTransitionModal
          quotation={pendingTransition.quotation}
          isClosedStatus={false}
          onConfirm={(data) => {
            executeMove(pendingTransition.id, data.subStatus, {
              poNumber: data.poNumber,
              poDate: data.poDate,
              jobType: data.jobType,
              paymentMethod: data.paymentMethod,
              installments: data.installments,
              salesOrderDate: data.salesOrderDate,
              deliveryDate: data.deliveryDate,
              creditTerms: data.creditTerms,
              creditDocsUrl: data.creditDocsUrl,
              billingRegulations: data.billingRegulations,
              percentageTerms: data.percentageTerms,
              paymentDate: data.paymentDate,
              companyId: data.companyId,
              companyCode: data.companyCode
            });
            setPendingTransition(null);
          }}
          onCancel={() => setPendingTransition(null)}
        />
      )}
      {pendingTransition?.type === 'closed' && (
        <POTransitionModal
          quotation={pendingTransition.quotation}
          isClosedStatus={true}
          onConfirm={(data) => {
            executeMove(pendingTransition.id, 'เปิดบิลแล้ว', {
              poNumber: data.poNumber,
              poDate: data.poDate,
              jobType: data.jobType,
              paymentMethod: data.paymentMethod,
              installments: data.installments,
              salesOrderDate: data.salesOrderDate,
              deliveryDate: data.deliveryDate,
              creditTerms: data.creditTerms,
              creditDocsUrl: data.creditDocsUrl,
              billingRegulations: data.billingRegulations,
              percentageTerms: data.percentageTerms,
              paymentDate: data.paymentDate,
              companyId: data.companyId,
              companyCode: data.companyCode
            });
            setPendingTransition(null);
          }}
          onCancel={() => setPendingTransition(null)}
        />
      )}
      {pendingTransition?.type === 'appointment' && (
        <AppointmentTransitionModal
          quotation={pendingTransition.quotation}
          onConfirm={(data) => {
            executeMove(pendingTransition.id, pendingTransition.nextDbStatus, {
              appointmentDate: data.appointmentDate,
              appointmentNote: data.appointmentNote
            });
            setPendingTransition(null);
          }}
          onCancel={() => setPendingTransition(null)}
        />
      )}

      {/* ── Main View Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/40">
        {activeTab === 'new' ? (
          <div className="p-4 md:p-8">
            <NewQuotationForm
              businessTypes={businessTypes}
              initialData={editingData}
              currentUserSale={currentUserSale}
              onSuccess={() => {
                if (editingQuotation) {
                  router.push('/pipeline');
                } else {
                  setEditingData(null);
                  setActiveTab('list');
                }
              }}
            />
          </div>
        ) : (
          <div className="p-4 md:p-8 space-y-4 md:space-y-6">

            {/* Symmetrical Search & Filter Controls */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'expired' ? "ค้นหาใบเสนอราคาที่หมดอายุ (ชื่อบริษัท, เลขที่ QT)..." : "ค้นหาชื่อบริษัท, เลขที่ใบเสนอราคา, หรือผู้ติดต่อ..."}
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/15 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {activeTab === 'expired' ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold border border-stone-200 shadow-2xs">
                  <Clock size={14} className="text-stone-500" />
                  <span>ใบเสนอราคาที่หมดอายุแล้ว ({filteredQuotations.length.toLocaleString()})</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-60">
                    <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/15 appearance-none cursor-pointer transition-all"
                    >
                      <option value="">สถานะทั้งหมด</option>
                      <option value="เปิดบิลแล้ว">เปิดบิลแล้ว</option>
                      <option value="รอจัดทำ PO">รอจัดทำ PO</option>
                      <option value="PO แล้วรอสินค้า">PO แล้วรอสินค้า</option>
                      <option value="PO แล้วรอมัดจำ">PO แล้วรอมัดจำ</option>
                      <option value="PO แล้วรอเงินโอน">PO แล้วรอเงินโอน</option>
                      <option value="เสนอราคา">เสนอราคา</option>
                      <option value="ปฏิเสธ-ได้ที่อื่นแล้ว">ปฏิเสธ-ได้ที่อื่นแล้ว</option>
                      <option value="ปฏิเสธ-ยกเลิกสินค้า">ปฏิเสธ-ยกเลิกสินค้า</option>
                      <option value="ปฏิเสธ-อื่นๆ">ปฏิเสธ-อื่นๆ</option>
                      <option value="รอใบประเมินราคา">รอใบประเมินราคา</option>
                      <option value="ยกเลิก-Revise">ยกเลิก-Revise</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Quotations Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/90">
                      <th className="py-3.5 px-5">
                        <button 
                          onClick={() => setSortConfig({ key: 'date', direction: sortConfig?.key === 'date' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })} 
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider hover:text-red-600 transition-colors"
                        >
                          <span>วันที่ออก</span>
                          <ArrowUpDown size={12} className={sortConfig?.key === 'date' ? 'text-red-600' : 'text-slate-400'} />
                        </button>
                      </th>
                      <th className="py-3.5 px-5">
                        <button 
                          onClick={() => setSortConfig({ key: 'expirationDate', direction: sortConfig?.key === 'expirationDate' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })} 
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider hover:text-red-600 transition-colors"
                        >
                          <span>วันหมดอายุ</span>
                          <ArrowUpDown size={12} className={sortConfig?.key === 'expirationDate' ? 'text-red-600' : 'text-slate-400'} />
                        </button>
                      </th>
                      <th className="py-3.5 px-5">
                        <button 
                          onClick={() => setSortConfig({ key: 'quotationNumber', direction: sortConfig?.key === 'quotationNumber' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })} 
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider hover:text-red-600 transition-colors"
                        >
                          <span>เลขที่ใบเสนอราคา</span>
                          <ArrowUpDown size={12} className={sortConfig?.key === 'quotationNumber' ? 'text-red-600' : 'text-slate-400'} />
                        </button>
                      </th>
                      <th className="py-3.5 px-5">
                        <button 
                          onClick={() => setSortConfig({ key: 'company', direction: sortConfig?.key === 'company' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })} 
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider hover:text-red-600 transition-colors"
                        >
                          <span>บริษัทลูกค้า</span>
                          <ArrowUpDown size={12} className={sortConfig?.key === 'company' ? 'text-red-600' : 'text-slate-400'} />
                        </button>
                      </th>
                      <th className="py-3.5 px-5 text-right">
                        <button 
                          onClick={() => setSortConfig({ key: 'totalAmount', direction: sortConfig?.key === 'totalAmount' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })} 
                          className="flex items-center justify-end w-full gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider hover:text-red-600 transition-colors"
                        >
                          <span>ยอดเสนอราคา</span>
                          <ArrowUpDown size={12} className={sortConfig?.key === 'totalAmount' ? 'text-red-600' : 'text-slate-400'} />
                        </button>
                      </th>
                      <th className="py-3.5 px-5 text-right">
                        <button 
                          onClick={() => setSortConfig({ key: 'closingAmount', direction: sortConfig?.key === 'closingAmount' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })} 
                          className="flex items-center justify-end w-full gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider hover:text-red-600 transition-colors"
                        >
                          <span>ยอดปิดจริง</span>
                          <ArrowUpDown size={12} className={sortConfig?.key === 'closingAmount' ? 'text-red-600' : 'text-slate-400'} />
                        </button>
                      </th>
                      <th className="py-3.5 px-5">
                        <button 
                          onClick={() => setSortConfig({ key: 'status', direction: sortConfig?.key === 'status' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })} 
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider hover:text-red-600 transition-colors"
                        >
                          <span>สถานะ</span>
                          <ArrowUpDown size={12} className={sortConfig?.key === 'status' ? 'text-red-600' : 'text-slate-400'} />
                        </button>
                      </th>
                      <th className="py-3.5 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">ผู้ติดต่อ</th>
                      <th className="py-3.5 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">ผู้รับผิดชอบ</th>
                      <th className="py-3.5 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedQuotations.length > 0 ? (
                      sortedQuotations.map((record: any) => (
                        <tr key={record.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Date */}
                          <td className="py-4 px-5 text-xs font-medium text-slate-600 whitespace-nowrap" suppressHydrationWarning>
                            {(() => {
                              const d = record.billingDate || record.poDate || record.quotationDate || record.updatedAt || record.createdAt;
                              return d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                            })()}
                          </td>

                          {/* Expiration Date */}
                          <td className="py-4 px-5 text-xs whitespace-nowrap" suppressHydrationWarning>
                            {(() => {
                              const exp = calculateQuotationExpiration(record);
                              if (!exp.effectiveExpiryDate) return <span className="text-slate-300">—</span>;
                              const formatted = new Date(exp.effectiveExpiryDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
                              return (
                                <div className="flex flex-col gap-1">
                                  <span className={`font-semibold ${exp.isExpired ? 'text-stone-500 line-through' : 'text-slate-800'}`}>
                                    {formatted}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit border ${
                                    exp.isExpired
                                      ? 'bg-stone-100 text-stone-600 border-stone-300'
                                      : exp.isExtendedByFollowUp
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : exp.daysRemaining <= 5
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    {exp.statusText}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Quotation Number */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <span className="text-xs font-bold text-slate-900 font-mono tracking-tight bg-slate-100/70 px-2.5 py-1 rounded-lg border border-slate-200/60">
                              {record.quotationNumber || '—'}
                            </span>
                          </td>

                          {/* Company */}
                          <td className="py-4 px-5 max-w-[240px]">
                            <p className="text-xs font-bold text-slate-900 truncate">{record.company?.companyName || '—'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {record.productType && (
                                <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200/80 truncate">
                                  {record.productType}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400 font-medium truncate">{record.company?.businessType || ''}</span>
                            </div>
                          </td>

                          {/* Total Amount Before VAT */}
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <span className="text-xs font-bold text-slate-800 font-mono">
                              {record.totalAmountBeforeVat ? `฿${Number(record.totalAmountBeforeVat).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </span>
                          </td>

                          {/* Actual Closing Amount */}
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <span className={`text-xs font-black font-mono ${record.actualClosingAmount ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {record.actualClosingAmount ? `฿${Number(record.actualClosingAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <select
                              value={record.status || ''}
                              onChange={(e) => handleStatusChange(record, e.target.value)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border outline-none focus:border-red-600 cursor-pointer shadow-2xs ${
                                record.status === 'หมดอายุ'
                                  ? 'bg-stone-100 text-stone-700 border-stone-300'
                                  : record.status === 'เสนอราคา'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : record.status === 'เปิดบิลแล้ว'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-white text-slate-800 border-slate-200'
                              }`}
                            >
                              <option value={record.status} className="hidden">{record.status}</option>
                              {record.status === 'หมดอายุ' && (
                                <option value="หมดอายุ" disabled>หมดอายุ (ระบบกำหนดอัตโนมัติ)</option>
                              )}
                              {ALL_STATUSES.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            {(() => {
                              const exp = calculateQuotationExpiration(record);
                              if (record.status === 'หมดอายุ') {
                                return (
                                  <p className="text-[10px] text-stone-500 font-medium mt-1" suppressHydrationWarning>
                                    {exp.statusText}
                                  </p>
                                );
                              }
                              if (record.status === 'เสนอราคา' && exp.effectiveExpiryDate) {
                                return (
                                  <p className={`text-[10px] font-medium mt-1 ${exp.daysRemaining <= 5 ? 'text-rose-600 font-bold' : 'text-slate-400'}`} suppressHydrationWarning>
                                    {exp.statusText}
                                  </p>
                                );
                              }
                              return null;
                            })()}
                          </td>

                          {/* Contact */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <p className="text-xs font-medium text-slate-700">{record.contact?.contactName || '—'}</p>
                          </td>

                          {/* Salesperson */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <p className="text-xs font-medium text-slate-700">{record.salesperson?.fullName || '—'}</p>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4 px-5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEdit(record)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                title="แก้ไขใบเสนอราคา"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(record)}
                                className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                                title="ลบใบเสนอราคา"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                              <FileText size={28} />
                            </div>
                            <p className="text-sm font-bold text-slate-600">
                              {searchTerm || statusFilter ? 'ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา' : 'ยังไม่มีข้อมูลใบเสนอราคา'}
                            </p>
                            <p className="text-xs text-slate-400">สามารถกดปุ่ม "สร้างใบเสนอราคาใหม่" เพื่อเริ่มต้นบันทึกข้อมูล</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredQuotations.length > 0 && (
                <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>ตารางแสดงข้อมูลใบเสนอราคา</span>
                  <span>แสดง {filteredQuotations.length.toLocaleString()} รายการ จากทั้งหมด {currentTabQuotations.length.toLocaleString()} รายการ</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={() => { }}
      />

      {showCoinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl scale-in-center border border-slate-200">
            <div className="text-6xl mb-4">🪙</div>
            <h2 className="text-2xl font-black text-amber-600 mb-2">ยินดีด้วย! คุณได้รับเหรียญรางวัล</h2>
            <p className="text-slate-600 mb-6 font-medium text-sm">{coinModalData.message}</p>
            <button 
              type="button"
              onClick={() => setShowCoinModal(false)} 
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl w-full shadow-lg shadow-red-600/20 transition-all active:scale-95"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {/* Symmetrical Delete Confirmation Modal */}
      {isDeleteModalOpen && quotationToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden scale-in-center p-6 text-center border border-slate-200">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 border border-red-100">
              <Trash2 size={28} />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2">ยืนยันการลบใบเสนอราคา</h2>
            <p className="text-slate-500 mb-6 text-xs font-medium leading-relaxed">
              คุณต้องการลบใบเสนอราคา <span className="font-bold text-slate-900 font-mono">{quotationToDelete.quotationNumber || quotationToDelete.company?.companyName || 'นี้'}</span> ใช่หรือไม่?
              <br />ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  'ยืนยันลบ'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
