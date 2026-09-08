"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  DollarSign,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  X,
  Loader2,
  ClipboardList,
  ChevronUp,
  ChevronDown,
  Filter,
  Download,
  Award,
  BarChart3,
  RotateCcw,
  User,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  Receipt,
  FileCheck,
  CreditCard,
  Layers,
  ArrowDownRight,
  AlertCircle
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { updatePaymentTaskStatus, recordPaymentDeposit, updatePaymentTaskCreditType } from "@/app/actions/accounting";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '-';
  let year = date.getFullYear();
  if (year < 2500) year += 543;
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${year}`;
}

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined || isNaN(amount)) return '฿0.00';
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
}

function CompanyBadge({ code }: { code: string }) {
  const styles: Record<string, string> = {
    TP: "bg-blue-50 text-blue-800 border-blue-200",
    TG: "bg-emerald-50 text-emerald-800 border-emerald-200",
    TE: "bg-purple-50 text-purple-800 border-purple-200",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold border whitespace-nowrap ${styles[code] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
      {code}
    </span>
  );
}

function JobDetailModal({
  jobId,
  onClose,
  onConfirmPayment,
  onRecordDeposit,
  onUpdateCreditType,
  isPending
}: {
  jobId: string,
  onClose: () => void,
  onConfirmPayment: (id: string, status: string, note: string, invoiceNumber?: string, invoiceDate?: string) => void,
  onRecordDeposit: (id: string, amount: number, note: string) => void,
  onUpdateCreditType: (id: string, creditType: string) => void,
  isPending: boolean
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [confirmPaymentModal, setConfirmPaymentModal] = useState<{ id: string, status: string } | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');

  useEffect(() => {
    fetch(`/api/accounting/job/${jobId}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [jobId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-2xl flex flex-col items-center gap-3 shadow-xl">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-slate-600">กำลังโหลดรายละเอียดงาน...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.job) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-2xl w-80 text-center relative shadow-xl">
          <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
          <p className="text-rose-600 font-bold mb-4 mt-2">ไม่พบข้อมูลงาน</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl">
            ปิด
          </button>
        </div>
      </div>
    );
  }

  const { job, quotation, company, paymentTasks, stepLogs, project } = data;
  const projectValueExclVat = project?.projectValue ? Number(project.projectValue) * 100 / 107 : undefined;

  // Format steps timeline
  const renderSteps = () => {
    if (!stepLogs || stepLogs.length === 0) return <p className="text-xs text-slate-500">ไม่มีข้อมูลขั้นตอน</p>;

    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {stepLogs.map((log: any, index: number) => (
          <React.Fragment key={log.id}>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={13} /> {log.step}
            </span>
            {index < stepLogs.length - 1 && <span className="text-slate-300">&rarr;</span>}
          </React.Fragment>
        ))}
        {job.currentStep !== 'complete' && job.currentStep !== stepLogs[stepLogs.length - 1]?.step && (
          <>
            {stepLogs.length > 0 && <span className="text-slate-300">&rarr;</span>}
            <span className="font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
              <Clock size={13} /> {job.currentStep}
            </span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 animate-in zoom-in-95">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <ClipboardList className="text-blue-600" size={22} />
              งาน {job.jobNumber}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{company?.companyName || job.customerName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Info */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Building2 size={14} /> ข้อมูลลูกค้า (Customer)
            </h3>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs">
              <div>
                <p className="text-slate-400 mb-0.5 font-medium">ชื่อบริษัท / ลูกค้า</p>
                <p className="font-bold text-slate-900 text-sm">{company?.companyName || job.customerName}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-0.5 font-medium">เลขประจำตัวผู้เสียภาษี</p>
                <p className="font-semibold text-slate-800">{company?.taxId || '-'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-400 mb-0.5 font-medium">ที่อยู่</p>
                <p className="text-slate-700">{company?.address || '-'}</p>
              </div>
              {company?.phone && (
                <div>
                  <p className="text-slate-400 mb-0.5 font-medium">เบอร์โทรศัพท์</p>
                  <p className="text-slate-700">{company.phone}</p>
                </div>
              )}
            </div>
          </section>

          {/* Quotation / Project Info */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Receipt size={14} /> {project ? 'ข้อมูลโปรเจค (Project Info)' : 'ข้อมูลใบเสนอราคา'}
            </h3>
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200/80 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs">
              <div>
                <p className="text-blue-600/70 mb-0.5 font-medium">{project ? 'เลขที่โปรเจค' : 'เลขที่ใบเสนอราคา'}</p>
                <p className="font-bold text-blue-950 text-sm">{project?.projectNumber || quotation?.quotationNumber || job.quotationNumber || '-'}</p>
              </div>
              <div>
                <p className="text-blue-600/70 mb-0.5 font-medium">วันที่ลงนาม/เสนอราคา</p>
                <p className="font-semibold text-blue-950">
                  {project?.contractSigningDate
                    ? formatDate(project.contractSigningDate)
                    : (quotation?.quotationDate ? formatDate(quotation.quotationDate) : '-')}
                </p>
              </div>
              <div>
                <p className="text-blue-600/70 mb-0.5 font-medium">มูลค่ารวมสุทธิ (Excl. VAT)</p>
                <p className="font-black text-blue-700 text-sm">
                  {projectValueExclVat
                    ? formatCurrency(projectValueExclVat)
                    : (quotation?.totalAmountBeforeVat ? formatCurrency(quotation.totalAmountBeforeVat) : '-')}
                </p>
              </div>
              <div>
                <p className="text-blue-600/70 mb-0.5 font-medium">สินค้า/บริการ</p>
                <p className="font-semibold text-blue-950">{project?.name || quotation?.subject || job.item || '-'}</p>
              </div>
              <div>
                <p className="text-blue-600/70 mb-0.5 font-medium">ผู้รับผิดชอบ (Sales)</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-blue-950">{project?.contractSignatory || quotation?.salesperson?.fullName || job.sellerName || '-'}</p>
                  {(data.awardedGold || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full border border-yellow-200">
                      <Award size={12} /> {data.awardedGold} เหรียญทอง
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Sales Confirmation Info */}
          {(job.salesOrderDate || job.deliveryDate || job.paymentDate || job.creditTerms || job.billingRegulations || job.percentageTerms) && (
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">ข้อมูลยืนยันการขาย (Sales Confirmation)</h3>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs">
                <div>
                  <p className="text-slate-400 mb-0.5 font-medium">วันที่สั่งซื้อ (Order Date)</p>
                  <p className="font-semibold text-slate-900">{job.salesOrderDate ? formatDate(job.salesOrderDate) : '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5 font-medium">วันที่ส่งมอบ (Delivery Date)</p>
                  <p className="font-semibold text-slate-900">{job.deliveryDate ? formatDate(job.deliveryDate) : '-'}</p>
                </div>
                {job.paymentMethod === 'เงินสด' && (
                  <div>
                    <p className="text-slate-400 mb-0.5 font-medium">วันที่ชำระเงิน (Payment Date)</p>
                    <p className="font-semibold text-slate-900">{job.paymentDate ? formatDate(job.paymentDate) : '-'}</p>
                  </div>
                )}

                {job.paymentMethod !== 'เงินสด' && (
                  <>
                    <div className="sm:col-span-2 flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 mb-0.5 font-medium">เงื่อนไขเครดิต</p>
                        <p className="font-semibold text-slate-800">{job.creditTerms || '-'}</p>
                      </div>
                      {job.creditDocsUrl && (
                        <a href={job.creditDocsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200 transition-colors">
                          ดูเอกสารอนุมัติเครดิต
                        </a>
                      )}
                    </div>
                    {job.billingRegulations && (
                      <div className="sm:col-span-2">
                        <p className="text-slate-400 mb-0.5 font-medium">ระเบียบการวางบิล และเงื่อนไขการจ่ายเงิน</p>
                        <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 whitespace-pre-wrap">{job.billingRegulations}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {/* Payment Info */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <DollarSign size={14} className="text-emerald-600" /> รายการงวดชำระเงิน (Payment Tasks)
            </h3>
            <div className="space-y-3 text-xs">
              {(paymentTasks || []).map((pt: any) => {
                const ptIsCompleted = pt.status === 'ตรวจสอบและบันทึกแล้ว';
                const isOverdue = !ptIsCompleted && pt.dueDate && new Date(pt.dueDate) < new Date();
                return (
                  <div key={pt.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                    <div>
                      <p className="text-slate-400 mb-0.5 font-medium">งวดการชำระ</p>
                      <p className="font-bold text-slate-900 text-sm">
                        {pt.installmentNo
                          ? `งวดที่ ${pt.installmentNo}/${pt.installmentTotal} - ${formatCurrency(pt.installmentAmount)}`
                          : (pt.job?.paymentMethod || pt.paymentMethod || job.paymentMethod || '-')}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-0.5 font-medium">วันครบกำหนด</p>
                      <p className={`font-bold ${isOverdue ? 'text-rose-600 flex items-center gap-1' : 'text-slate-800'}`}>
                        {isOverdue && <AlertTriangle size={13} />}
                        {pt.dueDate ? formatDate(pt.dueDate) : '-'}
                      </p>
                    </div>

                    {((pt.job?.paymentMethod || pt.paymentMethod || job.paymentMethod) !== 'เงินสด' && (pt.job?.paymentMethod || pt.paymentMethod || job.paymentMethod) !== 'จ่ายแล้ว') && (
                      <div className="sm:col-span-2">
                        <p className="text-slate-400 mb-0.5 font-medium">รูปแบบการให้เครดิต</p>
                        {ptIsCompleted ? (
                          <p className="font-bold text-slate-800">{pt.creditType || '-'}</p>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="ระบุรูปแบบเครดิต (เช่น เช็ค, LC, วางบิล 30 วัน)"
                              defaultValue={pt.creditType || ''}
                              onBlur={(e) => {
                                if (e.target.value !== (pt.creditType || '')) {
                                  onUpdateCreditType(pt.id, e.target.value);
                                  setData((prev: any) => ({
                                    ...prev,
                                    paymentTasks: prev.paymentTasks.map((t: any) => t.id === pt.id ? { ...t, creditType: e.target.value } : t)
                                  }));
                                }
                              }}
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                            />
                            <span className="text-[10px] text-slate-400 self-center whitespace-nowrap">บันทึกอัตโนมัติ</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="sm:col-span-2 flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                      <div>
                        <p className="text-slate-400 mb-0.5 font-medium">สถานะงวดนี้</p>
                        <p className="font-bold flex items-center gap-1.5">
                          {ptIsCompleted ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 font-semibold">
                              <CheckCircle2 size={13} /> ตรวจสอบและบันทึกแล้ว
                            </span>
                          ) : pt.status === 'ชำระมัดจำแล้ว' ? (
                            <span className="text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1 font-semibold">
                              <CheckCircle2 size={13} /> ชำระมัดจำแล้ว
                            </span>
                          ) : (
                            <span className="text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 font-semibold">
                              <Clock size={13} /> {pt.status || 'รอดำเนินการ'}
                            </span>
                          )}
                        </p>
                      </div>
                      {!ptIsCompleted && (
                        <div className="flex gap-2">
                          {(!pt.paidAmount || pt.paidAmount === 0) && (
                            <button
                              disabled={isPending}
                              onClick={() => setShowDepositModal(pt.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-600 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                              บันทึกเงินมัดจำ
                            </button>
                          )}
                          <button
                            disabled={isPending}
                            onClick={() => setConfirmPaymentModal({ id: pt.id, status: 'ตรวจสอบและบันทึกแล้ว' })}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                          >
                            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 size={13} />}
                            ยืนยันรับเงิน
                          </button>
                        </div>
                      )}
                    </div>

                    {ptIsCompleted && (pt.invoiceNumber || pt.invoiceDate) && (
                      <div className="sm:col-span-2 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex gap-6 mt-1">
                        {pt.invoiceNumber && (
                          <div>
                            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">เลขที่ใบกำกับภาษี / ใบเสร็จ</p>
                            <p className="text-sm font-black text-emerald-950">{pt.invoiceNumber}</p>
                          </div>
                        )}
                        {pt.invoiceDate && (
                          <div>
                            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">วันที่ในเอกสาร</p>
                            <p className="text-sm font-black text-emerald-950">{formatDate(pt.invoiceDate)}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {pt.paidAmount !== null && pt.paidAmount !== undefined && pt.paidAmount > 0 && !ptIsCompleted && (
                      <div className="sm:col-span-2 bg-white p-3 rounded-xl border border-slate-200 mt-1">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-emerald-700">มัดจำแล้ว: {formatCurrency(pt.paidAmount)}</p>
                        </div>
                        <p className="text-slate-500 text-[11px]">
                          ยอดคงเหลือที่ต้องชำระ: {formatCurrency((pt.installmentAmount || projectValueExclVat || quotation?.actualClosingAmount || quotation?.totalAmountBeforeVat || 0) - pt.paidAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Job Status Steps */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">สถานะขั้นตอนงาน (Job Steps)</h3>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {renderSteps()}
            </div>
          </section>
        </div>

        {/* Deposit Modal */}
        {showDepositModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative border border-slate-200">
              <button onClick={() => { setShowDepositModal(null); setDepositAmount(''); }} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
              <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-600" />
                บันทึกเงินมัดจำ
              </h3>

              <div className="mb-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ยอดเงินมัดจำที่ได้รับ (บาท)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หมายเหตุ (ถ้ามี)</label>
                  <input
                    type="text"
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
                    placeholder="พิมพ์หมายเหตุ..."
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDepositModal(null); setDepositAmount(''); setDepositNote(''); }}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    const amt = Number(depositAmount);
                    if (amt > 0 && showDepositModal) {
                      onRecordDeposit(showDepositModal, amt, depositNote);
                      setData((prev: any) => ({
                        ...prev,
                        paymentTasks: prev.paymentTasks?.map((pt: any) => pt.id === showDepositModal ? {
                          ...pt,
                          status: 'ชำระมัดจำแล้ว',
                          paidAmount: amt,
                          note: depositNote || pt.note
                        } : pt)
                      }));
                      setShowDepositModal(null);
                      setDepositAmount('');
                      setDepositNote('');
                    }
                  }}
                  disabled={isPending || !depositAmount || Number(depositAmount) <= 0}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  บันทึกมัดจำ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Payment Modal inside JobDetailModal */}
        {confirmPaymentModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative border border-slate-200">
              <button onClick={() => { setConfirmPaymentModal(null); setPaymentNote(''); setInvoiceNumber(''); setInvoiceDate(''); }} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
              <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                ยืนยันการรับเงิน
              </h3>

              <div className="mb-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เลขที่ใบกำกับภาษี / ใบเสร็จ</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
                    placeholder="เช่น INV-2026-001"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">วันที่ในเอกสาร</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หมายเหตุ (ถ้ามี)</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
                    placeholder="พิมพ์หมายเหตุ..."
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmPaymentModal(null); setPaymentNote(''); setInvoiceNumber(''); setInvoiceDate(''); }}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    onConfirmPayment(confirmPaymentModal.id, confirmPaymentModal.status, paymentNote, invoiceNumber, invoiceDate);
                    setData((prev: any) => ({
                      ...prev,
                      paymentTasks: prev.paymentTasks?.map((pt: any) => pt.id === confirmPaymentModal.id ? {
                        ...pt,
                        status: confirmPaymentModal.status,
                        note: paymentNote || pt.note,
                        invoiceNumber: invoiceNumber || pt.invoiceNumber,
                        invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : pt.invoiceDate,
                        paidDate: confirmPaymentModal.status === 'ตรวจสอบและบันทึกแล้ว' ? new Date().toISOString() : pt.paidDate
                      } : pt)
                    }));
                    setConfirmPaymentModal(null);
                    setPaymentNote('');
                    setInvoiceNumber('');
                    setInvoiceDate('');
                  }}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-5 flex justify-end gap-3 z-10 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountingClientPage({ tasks: initialTasks }: { tasks: any[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isPending, startTransition] = useTransition();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const [confirmPaymentModal, setConfirmPaymentModal] = useState<{ id: string, status: string } | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');

  // Primary Status Tab Filter
  const [activeStatusTab, setActiveStatusTab] = useState<'ALL' | 'PENDING' | 'DEPOSIT' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [companyFilter, setCompanyFilter] = useState<'ALL' | 'TE' | 'TP' | 'TG'>('ALL');

  // Search & Filter Fields
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSalesperson, setFilterSalesperson] = useState("");
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [isJobTypeDropdownOpen, setIsJobTypeDropdownOpen] = useState(false);

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const uniqueJobTypes = useMemo(() => Array.from(new Set(tasks.map(t => t.job?.jobType).filter(Boolean))), [tasks]);
  const uniquePaymentMethods = useMemo(() => Array.from(new Set(tasks.map(t => t.job?.paymentMethod).filter(Boolean))), [tasks]);
  const uniqueYears = useMemo(() => Array.from(new Set(tasks.map(t => t.job?.yearBe).filter(Boolean))).sort((a, b) => Number(b) - Number(a)), [tasks]);
  const uniqueSalespersons = useMemo(() => Array.from(new Set(tasks.map(t => t.job?.project?.contractSignatory || t.job?.quotation?.salesperson?.fullName || t.job?.sellerName).filter(Boolean))).sort(), [tasks]);

  const handleUpdate = (id: string, status: string, note: string = "", invoiceNumber?: string, invoiceDate?: string) => {
    startTransition(async () => {
      await updatePaymentTaskStatus(id, status, note, invoiceNumber, invoiceDate);
      setTasks(prev => prev.map(t => t.id === id ? {
        ...t,
        status,
        note: note || t.note,
        invoiceNumber: invoiceNumber || t.invoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : t.invoiceDate,
        paidDate: status === 'ตรวจสอบและบันทึกแล้ว' ? new Date().toISOString() : t.paidDate
      } : t));

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'บันทึกสถานะการชำระเงินสำเร็จ',
        showConfirmButton: false,
        timer: 1500
      });
    });
  };

  const handleRecordDeposit = (id: string, amount: number, note: string = "") => {
    startTransition(async () => {
      await recordPaymentDeposit(id, amount, note);
      setTasks(prev => prev.map(t => t.id === id ? {
        ...t,
        status: 'ชำระมัดจำแล้ว',
        paidAmount: amount,
        note: note || t.note
      } : t));

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'บันทึกเงินมัดจำสำเร็จ',
        showConfirmButton: false,
        timer: 1500
      });
    });
  };

  const handleUpdateCreditType = (id: string, creditType: string) => {
    startTransition(async () => {
      await updatePaymentTaskCreditType(id, creditType);
      setTasks(prev => prev.map(t => t.id === id ? {
        ...t,
        creditType
      } : t));
    });
  };

  // Group Tasks by Job
  const groupedJobs = useMemo(() => {
    const map = new Map<string, any>();
    tasks.forEach(t => {
      if (!t.job) return;
      if (!map.has(t.job.id)) {
        map.set(t.job.id, {
          id: t.job.id,
          job: t.job,
          tasks: []
        });
      }
      map.get(t.job.id).tasks.push(t);
    });

    const groups = Array.from(map.values());
    groups.forEach(g => {
      g.tasks.sort((a: any, b: any) => (a.installmentNo || 0) - (b.installmentNo || 0));
    });
    return groups;
  }, [tasks]);

  // High Level Financial KPIs
  const metrics = useMemo(() => {
    let pendingJobsCount = 0;
    let completedJobsCount = 0;
    let overdueJobsCount = 0;
    let depositJobsCount = 0;

    let pendingAmount = 0;
    let completedAmount = 0;
    let overdueAmount = 0;

    const now = new Date();

    groupedJobs.forEach(g => {
      const allCompleted = g.tasks.every((t: any) => t.status === 'ตรวจสอบและบันทึกแล้ว');
      const hasDeposit = g.tasks.some((t: any) => t.status === 'ชำระมัดจำแล้ว');
      const isOverdue = !allCompleted && g.tasks.some((t: any) => t.status !== 'ตรวจสอบและบันทึกแล้ว' && t.dueDate && new Date(t.dueDate) < now);

      if (allCompleted) {
        completedJobsCount++;
      } else {
        pendingJobsCount++;
        if (hasDeposit) depositJobsCount++;
        if (isOverdue) overdueJobsCount++;
      }

      g.tasks.forEach((t: any) => {
        const isPaid = t.status === 'ตรวจสอบและบันทึกแล้ว';
        const projectVal = g.job?.project?.projectValue ? Number(g.job.project.projectValue) * 100 / 107 : null;
        const totalVal = Number(projectVal || g.job?.quotation?.actualClosingAmount || g.job?.quotation?.totalAmountBeforeVat || 0);
        const taskAmt = Number(t.installmentAmount) || (t.installmentNo ? 0 : totalVal);
        const paidAmt = Number(t.paidAmount) || 0;

        if (isPaid) {
          completedAmount += taskAmt > 0 ? taskAmt : (paidAmt > 0 ? paidAmt : totalVal);
        } else {
          const remain = Math.max(0, taskAmt - paidAmt);
          pendingAmount += remain;
          if (t.dueDate && new Date(t.dueDate) < now) {
            overdueAmount += remain;
          }
        }
      });
    });

    return {
      totalJobs: groupedJobs.length,
      pendingJobsCount,
      completedJobsCount,
      overdueJobsCount,
      depositJobsCount,
      pendingAmount,
      completedAmount,
      overdueAmount
    };
  }, [groupedJobs]);

  // Company Counts
  const companyCounts = useMemo(() => {
    const counts = { ALL: groupedJobs.length, TE: 0, TP: 0, TG: 0 };
    groupedJobs.forEach(g => {
      const c = g.job?.companyCode;
      if (c === 'TE') counts.TE++;
      if (c === 'TP') counts.TP++;
      if (c === 'TG') counts.TG++;
    });
    return counts;
  }, [groupedJobs]);

  // Main Filter Engine
  const filteredJobs = useMemo(() => {
    const now = new Date();

    return groupedJobs.filter(g => {
      const allCompleted = g.tasks.every((t: any) => t.status === 'ตรวจสอบและบันทึกแล้ว');
      const hasDeposit = g.tasks.some((t: any) => t.status === 'ชำระมัดจำแล้ว');
      const isOverdue = !allCompleted && g.tasks.some((t: any) => t.status !== 'ตรวจสอบและบันทึกแล้ว' && t.dueDate && new Date(t.dueDate) < now);

      // 1. Status Tab Filter
      if (activeStatusTab === 'PENDING' && allCompleted) return false;
      if (activeStatusTab === 'COMPLETED' && !allCompleted) return false;
      if (activeStatusTab === 'DEPOSIT' && !hasDeposit) return false;
      if (activeStatusTab === 'OVERDUE' && !isOverdue) return false;

      // 2. Company Filter
      if (companyFilter !== 'ALL' && g.job?.companyCode !== companyFilter) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const jNum = (g.job?.jobNumber || '').toLowerCase();
        const cust = (g.job?.customerName || '').toLowerCase();
        const item = (g.job?.item || '').toLowerCase();
        const seller = (g.job?.sellerName || g.job?.project?.contractSignatory || g.job?.quotation?.salesperson?.fullName || '').toLowerCase();

        if (!jNum.includes(q) && !cust.includes(q) && !item.includes(q) && !seller.includes(q)) {
          return false;
        }
      }

      // 4. Payment Method
      if (filterPaymentMethod) {
        const isInstallment = g.tasks.length > 1 || g.tasks.some((t: any) => t.installmentNo);
        if (filterPaymentMethod === 'ผ่อนชำระ' && !isInstallment) return false;
        if (filterPaymentMethod !== 'ผ่อนชำระ' && g.job?.paymentMethod !== filterPaymentMethod) return false;
      }

      // 5. Job Types
      if (selectedJobTypes.length > 0 && !selectedJobTypes.includes(g.job?.jobType)) {
        return false;
      }

      // 6. Month / Year
      if (filterMonth && g.job?.month !== parseInt(filterMonth, 10)) return false;
      if (filterYear && g.job?.yearBe !== parseInt(filterYear, 10)) return false;

      // 7. Salesperson
      if (filterSalesperson) {
        const seller = g.job?.sellerName || g.job?.project?.contractSignatory || g.job?.quotation?.salesperson?.fullName;
        if (seller !== filterSalesperson) return false;
      }

      return true;
    });
  }, [groupedJobs, activeStatusTab, companyFilter, searchQuery, filterPaymentMethod, selectedJobTypes, filterMonth, filterYear, filterSalesperson]);

  // Sorting
  const sortedJobs = useMemo(() => {
    let sortableItems = [...filteredJobs];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'jobNumber') {
          aValue = a.job?.jobNumber || '';
          bValue = b.job?.jobNumber || '';
        } else if (sortConfig.key === 'customerName') {
          aValue = a.job?.customerName || '';
          bValue = b.job?.customerName || '';
        } else if (sortConfig.key === 'company') {
          aValue = a.job?.companyCode || '';
          bValue = b.job?.companyCode || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredJobs, sortConfig]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / pageSize));
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedJobs.slice(start, start + pageSize);
  }, [sortedJobs, currentPage]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCompanyFilter('ALL');
    setActiveStatusTab('ALL');
    setFilterPaymentMethod('');
    setFilterMonth('');
    setFilterYear('');
    setFilterSalesperson('');
    setSelectedJobTypes([]);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    companyFilter !== 'ALL' ||
    activeStatusTab !== 'ALL' ||
    filterPaymentMethod !== '' ||
    filterMonth !== '' ||
    filterYear !== '' ||
    filterSalesperson !== '' ||
    selectedJobTypes.length > 0;

  const exportToExcel = () => {
    const data = sortedJobs.flatMap((g: any) => {
      return g.tasks.map((t: any) => {
        const isPaid = t.status === 'ตรวจสอบและบันทึกแล้ว';
        let creditDaysLeft = '-';
        if (!isPaid && t.dueDate) {
          const diff = new Date(t.dueDate).getTime() - new Date().getTime();
          creditDaysLeft = Math.ceil(diff / (1000 * 3600 * 24)).toString();
        }

        const projectValueExclVat = g.job?.project?.projectValue ? Number(g.job.project.projectValue) * 100 / 107 : null;
        const totalValue = Number(projectValueExclVat || g.job?.quotation?.actualClosingAmount || g.job?.quotation?.totalAmountBeforeVat || 0);
        const amountDue = Number(t.installmentAmount) || (t.installmentNo ? 0 : totalValue);

        return {
          'เลขที่งาน (Job No.)': g.job?.jobNumber || '-',
          'ชื่อลูกค้า (Customer)': g.job?.customerName || '-',
          'บริษัท (Company)': g.job?.companyCode || '-',
          'รูปแบบการชำระเงิน': g.job?.paymentMethod || '-',
          'ยอดรวมทั้งโครงการ': totalValue,
          'งวดที่': t.installmentNo ? `${t.installmentNo}/${t.installmentTotal}` : '-',
          'ยอดเงินงวดนี้': amountDue,
          'วันครบกำหนด': t.dueDate ? formatDate(t.dueDate) : '-',
          'วันเครดิตคงเหลือ (วัน)': creditDaysLeft,
          'สถานะการชำระเงิน': t.status || '-'
        };
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Tasks");
    XLSX.writeFile(workbook, `Accounting_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Detail Modal */}
      {selectedJobId && (
        <JobDetailModal
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onConfirmPayment={handleUpdate}
          onRecordDeposit={handleRecordDeposit}
          onUpdateCreditType={handleUpdateCreditType}
          isPending={isPending}
        />
      )}

      {/* Standalone Confirm Payment Modal */}
      {confirmPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative border border-slate-200 animate-in zoom-in-95">
            <button onClick={() => { setConfirmPaymentModal(null); setPaymentNote(''); setInvoiceNumber(''); setInvoiceDate(''); }} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              ยืนยันการรับเงิน
            </h3>

            <div className="mb-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลขที่ใบกำกับภาษี / ใบเสร็จ</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
                  placeholder="เช่น INV-2026-001"
                  autoFocus
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">วันที่ในเอกสาร</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">หมายเหตุ (ถ้ามี)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
                  placeholder="พิมพ์หมายเหตุ..."
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmPaymentModal(null); setPaymentNote(''); setInvoiceNumber(''); setInvoiceDate(''); }}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  handleUpdate(confirmPaymentModal.id, confirmPaymentModal.status, paymentNote, invoiceNumber, invoiceDate);
                  setConfirmPaymentModal(null);
                  setPaymentNote('');
                  setInvoiceNumber('');
                  setInvoiceDate('');
                }}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                ยืนยันรับเงิน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Header & Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5">
            <Receipt className="w-3.5 h-3.5" />
            <span>การเงินและบัญชี</span>
            <span>/</span>
            <span className="text-slate-800 font-semibold">รายการตรวจสอบการชำระเงิน (AR Collections)</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            รายการตรวจสอบและบันทึกการชำระเงิน
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ติดตามยอดค้างรับ บันทึกเงินมัดจำ ออกใบกำกับภาษี และตรวจสอบสถานะลูกหนี้การค้า
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/accounting/dashboard"
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 shadow-sm transition-all"
          >
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>แดชบอร์ดภาพรวมการเงิน</span>
          </Link>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
            title="รีเฟรชข้อมูล"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Top 4 High-Level Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Collections */}
        <div
          onClick={() => {
            setActiveStatusTab('PENDING');
            setCurrentPage(1);
          }}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${activeStatusTab === 'PENDING'
            ? 'border-amber-400 ring-2 ring-amber-100'
            : 'border-slate-200/80 hover:border-amber-300'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">รอดำเนินการเรียกเก็บ</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.pendingJobsCount} <span className="text-sm font-normal text-slate-500">งาน</span>
            </div>
            <div className="text-xs text-amber-700 mt-1 font-semibold truncate">
              ยอดรอรับ: {formatCurrency(metrics.pendingAmount)}
            </div>
          </div>
        </div>

        {/* Card 2: Overdue AR */}
        <div
          onClick={() => {
            setActiveStatusTab('OVERDUE');
            setCurrentPage(1);
          }}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${activeStatusTab === 'OVERDUE'
            ? 'border-rose-400 ring-2 ring-rose-100'
            : 'border-slate-200/80 hover:border-rose-300'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">เลยกำหนดชำระ (Overdue)</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 tracking-tight">
              {metrics.overdueJobsCount} <span className="text-sm font-normal text-rose-400">งาน</span>
            </div>
            <div className="text-xs text-rose-600 mt-1 font-semibold truncate">
              ยอดเกินกำหนด: {formatCurrency(metrics.overdueAmount)}
            </div>
          </div>
        </div>

        {/* Card 3: Deposit Paid */}
        <div
          onClick={() => {
            setActiveStatusTab('DEPOSIT');
            setCurrentPage(1);
          }}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${activeStatusTab === 'DEPOSIT'
            ? 'border-blue-400 ring-2 ring-blue-100'
            : 'border-slate-200/80 hover:border-blue-300'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">ชำระมัดจำแล้ว</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.depositJobsCount} <span className="text-sm font-normal text-slate-500">งาน</span>
            </div>
            <div className="text-xs text-blue-600 mt-1 font-semibold">
              ได้รับเงินมัดจำบางส่วนแล้ว
            </div>
          </div>
        </div>

        {/* Card 4: Completed Collections */}
        <div
          onClick={() => {
            setActiveStatusTab('COMPLETED');
            setCurrentPage(1);
          }}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${activeStatusTab === 'COMPLETED'
            ? 'border-emerald-400 ring-2 ring-emerald-100'
            : 'border-slate-200/80 hover:border-emerald-300'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">ตรวจสอบและรับเงินแล้ว</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.completedJobsCount} <span className="text-sm font-normal text-slate-500">งาน</span>
            </div>
            <div className="text-xs text-emerald-700 mt-1 font-semibold truncate">
              ยอดรับแล้ว: {formatCurrency(metrics.completedAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Status Tabs, Company Pills, and Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
        {/* Row 1: Company Pills & Status Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">บริษัท:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'TE', 'TP', 'TG'] as const).map(comp => {
                const count = companyCounts[comp];
                const isSelected = companyFilter === comp;
                return (
                  <button
                    key={comp}
                    onClick={() => {
                      setCompanyFilter(comp);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                  >
                    <span>{comp === 'ALL' ? 'ทุกบริษัท' : comp}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] ${isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                        }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setActiveStatusTab('ALL'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeStatusTab === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              ทั้งหมด ({metrics.totalJobs})
            </button>
            <button
              onClick={() => { setActiveStatusTab('PENDING'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeStatusTab === 'PENDING' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              รอดำเนินการ ({metrics.pendingJobsCount})
            </button>
            <button
              onClick={() => { setActiveStatusTab('OVERDUE'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeStatusTab === 'OVERDUE' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              เลยกำหนด ({metrics.overdueJobsCount})
            </button>
            <button
              onClick={() => { setActiveStatusTab('COMPLETED'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeStatusTab === 'COMPLETED' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              ตรวจสอบแล้ว ({metrics.completedJobsCount})
            </button>
          </div>
        </div>

        {/* Row 2: Search & Granular Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          {/* Universal Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่งาน, ลูกค้า, รายการ หรือเซลส์..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Job Types Multi-select Dropdown */}
          <div className="md:col-span-2 relative">
            <button
              onClick={() => setIsJobTypeDropdownOpen(prev => !prev)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <span className="truncate">
                {selectedJobTypes.length === 0 ? "ทุกประเภทงาน" : `เลือก ${selectedJobTypes.length} ประเภท`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            </button>
            {isJobTypeDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-50 max-h-60 overflow-y-auto">
                <div className="flex flex-col gap-1 text-xs">
                  {uniqueJobTypes.map(type => (
                    <label key={type as string} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedJobTypes.includes(type as string)}
                        onChange={() => {
                          const val = type as string;
                          setSelectedJobTypes(prev =>
                            prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]
                          );
                          setCurrentPage(1);
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700 truncate">{type as string}</span>
                    </label>
                  ))}
                  {selectedJobTypes.length > 0 && (
                    <button
                      onClick={() => { setSelectedJobTypes([]); setCurrentPage(1); }}
                      className="mt-1 text-[11px] text-center text-rose-600 font-bold hover:underline py-1 w-full border-t border-slate-100"
                    >
                      ล้างตัวเลือก
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Salesperson Filter */}
          <div className="md:col-span-2">
            <select
              value={filterSalesperson}
              onChange={e => {
                setFilterSalesperson(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">ทุกเซลส์ผู้ดูแล</option>
              {uniqueSalespersons.map(s => (
                <option key={s as string} value={s as string}>{s as string}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="md:col-span-2">
            <select
              value={filterPaymentMethod}
              onChange={e => {
                setFilterPaymentMethod(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">ทุกรูปแบบชำระเงิน</option>
              <option value="ผ่อนชำระ">ผ่อนชำระ</option>
              {uniquePaymentMethods.map(p => p !== 'ผ่อนชำระ' && p ? (
                <option key={p as string} value={p as string}>{p as string}</option>
              ) : null)}
            </select>
          </div>

          {/* Month / Year Filter */}
          <div className="md:col-span-2">
            <select
              value={filterMonth}
              onChange={e => {
                setFilterMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">ทุกเดือน</option>
              {[
                { v: '1', l: 'มกราคม' }, { v: '2', l: 'กุมภาพันธ์' }, { v: '3', l: 'มีนาคม' }, { v: '4', l: 'เมษายน' },
                { v: '5', l: 'พฤษภาคม' }, { v: '6', l: 'มิถุนายน' }, { v: '7', l: 'กรกฎาคม' }, { v: '8', l: 'สิงหาคม' },
                { v: '9', l: 'กันยายน' }, { v: '10', l: 'ตุลาคม' }, { v: '11', l: 'พฤศจิกายน' }, { v: '12', l: 'ธันวาคม' }
              ].map(m => (
                <option key={m.v} value={m.v}>{m.l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Row & Reset Button */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-500 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700">กำลังกรองข้อมูล:</span>
              {searchQuery && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                  ค้นหา: &quot;{searchQuery}&quot;
                </span>
              )}
              {companyFilter !== 'ALL' && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                  บริษัท: {companyFilter}
                </span>
              )}
              {activeStatusTab !== 'ALL' && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                  สถานะ: {activeStatusTab === 'PENDING' ? 'รอดำเนินการ' : activeStatusTab === 'OVERDUE' ? 'เลยกำหนด' : activeStatusTab === 'COMPLETED' ? 'ตรวจสอบแล้ว' : 'ชำระมัดจำ'}
                </span>
              )}
              {filterSalesperson && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-300">
                  เซลส์: {filterSalesperson}
                </span>
              )}
            </div>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Main Content: Jobs Table with Pagination */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span>รายการงาน ({sortedJobs.length} งาน)</span>
          </div>
          <div className="text-xs text-slate-500">
            แสดง {sortedJobs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
            {Math.min(currentPage * pageSize, sortedJobs.length)} จาก {sortedJobs.length} งาน
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th onClick={() => requestSort('jobNumber')} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">เลขที่งาน {sortConfig?.key === 'jobNumber' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
                </th>
                <th onClick={() => requestSort('customerName')} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">ลูกค้า / รายการ {sortConfig?.key === 'customerName' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
                </th>
                <th className="py-3 px-4">บริษัท & เซลส์</th>
                <th className="py-3 px-4">รูปแบบ & ยอดเงิน</th>
                <th className="py-3 px-4 text-center">สถานะการชำระเงิน</th>
                <th className="py-3 px-4 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2" />
                    <span className="text-sm font-semibold text-slate-600">ไม่พบรายการงานที่ตรงกับเงื่อนไข</span>
                    <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองด้านบน</p>
                  </td>
                </tr>
              ) : (
                paginatedJobs.map(group => {
                  const allCompleted = group.tasks.every((t: any) => t.status === 'ตรวจสอบและบันทึกแล้ว');
                  const completedCount = group.tasks.filter((t: any) => t.status === 'ตรวจสอบและบันทึกแล้ว').length;
                  const hasInstallments = group.tasks.length > 1 || group.tasks.some((t: any) => t.installmentNo);
                  const isOverdue = !allCompleted && group.tasks.some((t: any) => t.status !== 'ตรวจสอบและบันทึกแล้ว' && t.dueDate && new Date(t.dueDate) < new Date());
                  const singlePendingTask = group.tasks.find((t: any) => t.status !== 'ตรวจสอบและบันทึกแล้ว');

                  const projectVal = group.job?.project?.projectValue ? Number(group.job.project.projectValue) * 100 / 107 : null;
                  const totalJobVal = Number(projectVal || group.job?.quotation?.actualClosingAmount || group.job?.quotation?.totalAmountBeforeVat || group.tasks[0]?.installmentAmount || 0);

                  return (
                    <tr key={group.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Job Number */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <Link
                            href={`/jobs?highlight=${group.job?.id}`}
                            className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {group.job?.jobNumber || '-'}
                          </Link>
                          {group.job?.salesOrderDate && (
                            <span className="text-[10px] text-slate-400">
                              สั่งซื้อ: {formatDate(group.job.salesOrderDate)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer / Item */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-900 truncate" title={group.job?.customerName}>
                            {group.job?.customerName || '-'}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate" title={group.job?.item}>
                            {group.job?.item || '-'}
                          </span>
                          {group.job?.jobType && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-bold w-fit">
                              {group.job.jobType}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Company & Sales */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <CompanyBadge code={group.job?.companyCode || '-'} />
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate" title={group.job?.sellerName}>
                            <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{group.job?.sellerName || group.job?.project?.contractSignatory || '-'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Payment & Amount */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          {hasInstallments ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                              ผ่อนชำระ ({group.tasks.length} งวด)
                            </span>
                          ) : (
                            <span className="text-slate-700 font-medium">
                              {group.job?.paymentMethod || '-'}
                            </span>
                          )}
                          <span className="font-bold text-slate-900 text-xs">
                            {formatCurrency(totalJobVal)}
                          </span>
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 w-fit mt-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>เลยกำหนดชำระ!</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {allCompleted ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ตรวจสอบแล้ว</span>
                            </span>
                            {group.tasks[group.tasks.length - 1]?.paidDate && (
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                {formatDate(group.tasks[group.tasks.length - 1].paidDate)}
                              </span>
                            )}
                          </div>
                        ) : group.tasks.some((t: any) => t.status === 'ชำระมัดจำแล้ว') ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              <span>ชำระมัดจำแล้ว {hasInstallments ? `(${completedCount}/${group.tasks.length})` : ''}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>รอดำเนินการ {hasInstallments ? `(${completedCount}/${group.tasks.length})` : ''}</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedJobId(group.job?.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Eye size={13} />
                            <span>ดูรายละเอียด</span>
                          </button>

                          {!hasInstallments && !allCompleted && singlePendingTask && (
                            <button
                              disabled={isPending}
                              onClick={() => setConfirmPaymentModal({ id: singlePendingTask.id, status: 'ตรวจสอบและบันทึกแล้ว' })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} />
                              <span>ยืนยันรับเงิน</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {sortedJobs.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="text-xs text-slate-500">
              หน้า <span className="font-semibold text-slate-800">{currentPage}</span> จาก{' '}
              <span className="font-semibold text-slate-800">{totalPages}</span> (ทั้งหมด {sortedJobs.length} งาน)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ก่อนหน้า</span>
              </button>
              <div className="text-xs font-bold px-2 text-slate-700">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>ถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
