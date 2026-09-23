"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  CheckCircle2, 
  DollarSign, 
  Building2, 
  User, 
  Send,
  History,
  PhoneCall,
  CreditCard,
  FileCheck,
  FileText,
  Loader2,
  ExternalLink,
  Paperclip,
  Truck,
  AlertCircle
} from 'lucide-react';
import { getFinancialDrilldownDetails, addJobFollowUpNote } from '@/app/actions/accountingDashboard';

export interface DrilldownItem {
  id: string;
  jobId?: string;
  title: string;
  contractOrJobNo: string;
  customerName: string;
  companyCode: string;
  amount: number;
  paidAmount?: number;
  outstandingAmount?: number;
  dueDate?: string;
  overdueDays?: number;
  status: string;
  statusBadgeClass?: string;
  paymentMethod?: string;
  reason?: string;
  personInCharge?: string;
  collateral?: string;
  bankStatus?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
}

interface FinancialDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DrilldownItem | null;
}

export default function FinancialDrilldownModal({ isOpen, onClose, item }: FinancialDrilldownModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'history' | 'reconciliation'>('schedule');
  const [newNote, setNewNote] = useState('');
  const [promisedDate, setPromisedDate] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Real data state
  const [realJob, setRealJob] = useState<any>(null);
  const [installments, setInstallments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Fetch real details from database when item changes
  useEffect(() => {
    if (!isOpen || !item) {
      setRealJob(null);
      setInstallments([]);
      setAuditLogs([]);
      setDocuments([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getFinancialDrilldownDetails({
      jobId: item.jobId,
      jobNumber: item.contractOrJobNo,
      customerName: item.customerName,
      paymentTaskId: item.id
    })
      .then((res) => {
        if (!isMounted) return;
        if (res.found && res.job) {
          setRealJob(res.job);
          setInstallments(res.installments || []);
          setAuditLogs(res.auditLogs || []);
          setDocuments(res.documents || []);
        } else {
          // Fallback to basic item info if not linked to a specific job in DB
          setRealJob(null);
          setInstallments([]);
          setAuditLogs([]);
          setDocuments([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load drilldown details:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isSubmittingNote) return;

    const targetJobId = realJob?.id || item.jobId;
    if (!targetJobId) {
      alert('ไม่พบรหัสงาน (Job ID) ในระบบ ไม่สามารถบันทึกข้อความได้');
      return;
    }

    setIsSubmittingNote(true);
    try {
      const res = await addJobFollowUpNote({
        jobId: targetJobId,
        note: newNote.trim(),
        authorName: 'ฝ่ายบัญชีและการเงิน',
        department: 'บัญชีและการเงิน',
        promisedDate: promisedDate || undefined
      });

      if (res.success && res.log) {
        setAuditLogs((prev) => [res.log, ...prev]);
        setNewNote('');
        setPromisedDate('');
      } else {
        alert(res.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm">
              {item.companyCode || realJob?.companyCode || 'TG'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{item.customerName}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-mono text-slate-700 font-semibold">
                  {realJob?.jobNumber || item.contractOrJobNo}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${item.statusBadgeClass || 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                เจาะลึกข้อมูลงวดชำระจริงจากฐานข้อมูล ประวัติการติดตาม และเอกสารแนบของงาน
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-slate-50/70 border-b border-gray-100 text-xs">
          <div>
            <span className="text-gray-400 font-medium">มูลค่ารวมตามสัญญา:</span>
            <div className="text-sm font-bold text-gray-900">฿{(item.amount || 0).toLocaleString('th-TH')}</div>
          </div>
          <div>
            <span className="text-gray-400 font-medium">ชำระแล้ว:</span>
            <div className="text-sm font-bold text-emerald-600">฿{(item.paidAmount || 0).toLocaleString('th-TH')}</div>
          </div>
          <div>
            <span className="text-gray-400 font-medium">ยอดคงค้าง:</span>
            <div className="text-sm font-bold text-rose-600">฿{((item.outstandingAmount !== undefined ? item.outstandingAmount : item.amount - (item.paidAmount || 0))).toLocaleString('th-TH')}</div>
          </div>
          <div>
            <span className="text-gray-400 font-medium">ผู้รับผิดชอบ:</span>
            <div className="text-sm font-bold text-slate-700">{realJob?.sellerName || item.personInCharge || 'ฝ่ายขายและการเงิน'}</div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex border-b border-gray-200 px-6 bg-white gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveSubTab('schedule')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeSubTab === 'schedule'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            ตารางงวดชำระจริง ({installments.length} งวด)
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeSubTab === 'history'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <History className="w-4 h-4" />
            ประวัติการติดตาม & บันทึก ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveSubTab('reconciliation')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeSubTab === 'reconciliation'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            เอกสารแนบ & การส่งมอบ ({documents.length})
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <span className="text-xs">กำลังดึงข้อมูลจริงจากระบบ...</span>
            </div>
          ) : (
            <>
              {/* Tab 1: ตารางงวดชำระจริง (Installments) */}
              {activeSubTab === 'schedule' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                      แผนงวดชำระจริงจากระบบ (Payment Tasks in Database)
                    </span>
                    {realJob?.deliveryDate && (
                      <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                        วันส่งมอบสินค้า: <strong className="text-gray-900">{realJob.deliveryDate}</strong>
                      </span>
                    )}
                  </div>

                  {installments.length === 0 ? (
                    <div className="border border-gray-200 rounded-xl p-8 text-center bg-gray-50/50">
                      <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="font-semibold text-gray-700 text-sm">ไม่พบการซอยงวดชำระในระบบ (การชำระงวดเดียว)</p>
                      <p className="text-xs text-gray-500 mt-1">
                        ยอดรวม: ฿{(item.amount || 0).toLocaleString('th-TH')} | ชำระแล้ว: ฿{(item.paidAmount || 0).toLocaleString('th-TH')} | 
                        ยอดค้าง: ฿{((item.outstandingAmount !== undefined ? item.outstandingAmount : item.amount - (item.paidAmount || 0))).toLocaleString('th-TH')}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">งวดที่</th>
                            <th className="py-2.5 px-3">วันครบกำหนด</th>
                            <th className="py-2.5 px-3 text-right">ยอดเงินงวด</th>
                            <th className="py-2.5 px-3 text-right">ชำระแล้ว</th>
                            <th className="py-2.5 px-3 text-center">สถานะ</th>
                            <th className="py-2.5 px-3">เลขที่ใบกำกับ / หมายเหตุ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {installments.map((inst) => (
                            <tr key={inst.id} className={inst.status === 'OVERDUE' ? 'bg-rose-50/40' : 'hover:bg-gray-50/60'}>
                              <td className="py-3 px-3 font-bold text-gray-900">งวดที่ {inst.no}</td>
                              <td className="py-3 px-3 font-mono text-gray-700">{inst.dueDate || '-'}</td>
                              <td className="py-3 px-3 text-right font-bold text-gray-900">
                                ฿{inst.amount.toLocaleString('th-TH')}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-emerald-600">
                                ฿{inst.paid.toLocaleString('th-TH')}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {inst.status === 'PAID' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    ชำระแล้ว
                                  </span>
                                )}
                                {inst.status === 'PARTIAL' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    ชำระบางส่วน
                                  </span>
                                )}
                                {inst.status === 'OVERDUE' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    ค้างชำระ ({inst.overdueDays} วัน)
                                  </span>
                                )}
                                {inst.status === 'PENDING' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                    ยังไม่ถึงกำหนด
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-xs text-gray-600">
                                {inst.invoiceNumber ? (
                                  <span className="font-mono font-medium text-blue-600">{inst.invoiceNumber}</span>
                                ) : inst.paidDate ? (
                                  <span>ชำระเมื่อ {inst.paidDate}</span>
                                ) : inst.note ? (
                                  <span>{inst.note}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: ประวัติการติดตามหนี้จริง (Real StepLogs & Action Notes) */}
              {activeSubTab === 'history' && (
                <div className="space-y-4">
                  {/* Add New Follow-up Form */}
                  <form onSubmit={handleAddNote} className="p-4 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                        บันทึกผลการติดตามหนี้จริงเข้าสู่ระบบ (Save Action Note)
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-gray-500">วันนัดชำระใหม่:</label>
                        <input 
                          type="date"
                          value={promisedDate}
                          onChange={(e) => setPromisedDate(e.target.value)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ระบุผลการโทรติดต่อ เหตุผลการผิดนัด หรือเงื่อนไขที่ตกลงกับลูกค้า..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingNote || !newNote.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        {isSubmittingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        บันทึก
                      </button>
                    </div>
                  </form>

                  {/* Follow-up Timeline */}
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                      ประวัติการดำเนินงานจริง (Audit Log from Database)
                    </span>
                    {auditLogs.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50/80 rounded-xl border border-slate-200">
                        <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600 text-sm">ยังไม่มีประวัติการบันทึกติดตามหนี้สำหรับรายการนี้</p>
                        <p className="text-xs text-slate-400 mt-1">สามารถพิมพ์บันทึกผลการติดตามหรือนัดชำระใหม่ผ่านแบบฟอร์มด้านบน</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {auditLogs.map((h) => (
                          <div key={h.id} className="p-3 bg-white border border-gray-100 rounded-xl shadow-xs flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                              <History className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-gray-900">{h.author}</span>
                                <span className="text-[11px] text-gray-400">{h.date}</span>
                              </div>
                              <p className="text-gray-700 leading-relaxed">{h.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: เอกสารแนบ & ข้อมูลจริง (Documents & Delivery Info) */}
              {activeSubTab === 'reconciliation' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block text-sm mb-0.5">
                        ข้อมูลการเรียกเก็บ & บัญชีบริษัท
                      </span>
                      <p className="text-slate-600 leading-relaxed">
                        การชำระเงินของลูกค้ารายนี้ผูกกับ {item.companyCode === 'TP' ? 'บริษัท เทอรา พาวเวอร์ จำกัด' : item.companyCode === 'TE' ? 'บริษัท เทอรา อิเล็คทริค จำกัด' : 'บริษัท เทอรา กรุ๊ป จำกัด'} — ช่องทาง: {realJob?.paymentMethod || item.paymentMethod || 'โอนผ่านบัญชีธนาคาร'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Real Documents */}
                    <div className="p-3.5 border border-gray-200 rounded-xl bg-white space-y-2.5">
                      <span className="font-bold text-gray-800 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                        เอกสารแนบในระบบ ({documents.length} รายการ)
                      </span>
                      {documents.length === 0 ? (
                        <p className="text-gray-400 text-xs py-4 text-center">ยังไม่มีเอกสารแนบในระบบสำหรับงานนี้</p>
                      ) : (
                        <div className="space-y-1.5">
                          {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between text-gray-600 p-2 rounded-lg bg-gray-50 border border-gray-100">
                              <span className="truncate max-w-[200px] font-medium text-gray-800">{doc.fileName}</span>
                              {doc.fileUrl ? (
                                <a 
                                  href={doc.fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                >
                                  เปิดดู <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-gray-400 text-[11px]">{doc.type}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Job Delivery & Operation Details */}
                    <div className="p-3.5 border border-gray-200 rounded-xl bg-white space-y-2">
                      <span className="font-bold text-gray-800 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-blue-600" />
                        ข้อมูลการส่งมอบ & วางบิล
                      </span>
                      <div className="flex items-center justify-between text-gray-600">
                        <span>วันส่งมอบสินค้า:</span>
                        <span className="font-medium text-gray-900">{realJob?.deliveryDate || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-600">
                        <span>บริษัทขนส่ง:</span>
                        <span className="font-medium text-gray-900">{realJob?.courierCompany || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-600">
                        <span>เลขพัสดุ / Tracking:</span>
                        <span className="font-mono text-gray-900">{realJob?.trackingNumber || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-600">
                        <span>เงื่อนไขเครดิต:</span>
                        <span className="font-medium text-gray-900">{realJob?.creditTerms || 'ตามเงื่อนไขสัญญา'}</span>
                      </div>
                      {realJob?.billingRegulations && (
                        <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                          <strong>ระเบียบวางบิล:</strong> {realJob.billingRegulations}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            รหัสอ้างอิง: <span className="font-mono font-medium">{realJob?.id || item.jobId || item.id}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-xs"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
